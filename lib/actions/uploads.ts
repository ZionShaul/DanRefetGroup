"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseExcel, type RawOrderLine } from "@/lib/excel/parse";

const BUCKET = process.env.SUPABASE_UPLOADS_BUCKET || "uploads";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export type UploadActionResult =
  | { ok: true; uploadId: string }
  | { ok: false; error: string };

/**
 * טעינת קובץ הספקים המאוחד: פרסור, מיפוי רפת (ארגון), כתיבת טיוטה.
 * אינו משפיע על המשתמשים עד הפרסום.
 */
export async function uploadAndParse(formData: FormData): Promise<UploadActionResult> {
  const admin = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "לא נבחר קובץ." };
  }

  const titleRaw = String(formData.get("title") ?? "").trim();
  const title = titleRaw || file.name;

  let result;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    result = parseExcel(buf);
  } catch {
    return { ok: false, error: "שגיאה בקריאת הקובץ. ודא/י שזהו קובץ אקסל תקין." };
  }

  if (result.totalRows === 0) {
    return { ok: false, error: "הקובץ ריק או שלא זוהו שורות נתונים." };
  }
  if (result.valid.length === 0) {
    return { ok: false, error: "לא נמצאו שורות תקינות. ודא/י שהקובץ כולל עמודות 'ארגון' ו'שם פריט'." };
  }

  const db = createAdminClient();

  // ניקוי טיוטות קודמות (טעינה אחת לכל היותר ממתינה לפרסום)
  await db.from("monthly_uploads").delete().eq("status", "draft");

  // 1) יצירת רשומת טעינה (טיוטה)
  const { data: upload, error: upErr } = await db
    .from("monthly_uploads")
    .insert({ file_name: file.name, title, status: "draft", uploaded_by: admin.id })
    .select("id")
    .single();
  if (upErr || !upload) {
    return { ok: false, error: "שגיאה ביצירת רשומת הטעינה: " + (upErr?.message ?? "") };
  }
  const uploadId = upload.id as string;

  // 2) שמירת הקובץ ב-Storage (לא חוסם במקרה כשל)
  let storagePath: string | null = null;
  try {
    const path = `${uploadId}/${file.name}`;
    const { error: stErr } = await db.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType:
          file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
    if (!stErr) storagePath = path;
  } catch {
    /* התעלמות – הנתונים נשמרים ב-DB ממילא */
  }

  // 3) מיפוי רפתות (ארגונים) לפי שם בעמודת "ארגון" (יצירה אוטומטית אם חסר)
  const orgMap = await resolveOrganizations(db, result.clients);

  // 4) בניית שורות ההזמנה
  const rows = result.valid.map((r: RawOrderLine) => ({
    upload_id: uploadId,
    organization_id: orgMap.get(r.client) ?? null,
    supplier: r.supplier,
    item_code: r.itemCode,
    product: r.product,
    order_no: r.orderNo,
    order_date: r.orderDate,
    delivery_month: r.deliveryMonth,
    price: r.price,
    tons_ordered: r.tonsOrdered,
    order_in_shipments: r.orderInShipments,
    balance: r.balance,
    qty_taken: r.qtyTaken,
  }));

  // 5) כתיבת שורות בקבוצות
  for (const part of chunk(rows, 500)) {
    const { error } = await db.from("order_lines").insert(part);
    if (error) return { ok: false, error: "שגיאה בשמירת שורות: " + error.message };
  }

  // 6) שורות חריגות (לוג)
  const rejected = result.rejected.map((r) => ({
    upload_id: uploadId,
    reason: r.reason,
    raw_data: r.raw,
  }));
  for (const part of chunk(rejected, 500)) {
    if (part.length) await db.from("rejected_rows").insert(part);
  }

  // 7) עדכון ספירות סיכום
  await db
    .from("monthly_uploads")
    .update({
      storage_path: storagePath,
      total_rows: result.totalRows,
      valid_rows: result.valid.length,
      rejected_rows: result.rejected.length,
      organizations_count: new Set([...orgMap.values()]).size,
      products_count: result.products.length,
    })
    .eq("id", uploadId);

  revalidatePath("/admin/upload");
  return { ok: true, uploadId };
}

/** פרסום טעינה – הופכת לפעילה היחידה; טעינות קודמות נמחקות (החלפה מלאה). */
export async function publishUpload(uploadId: string): Promise<UploadActionResult> {
  await requireAdmin();
  const supabase = await createClient(); // זהות המנהל – לצורך is_admin() ב-RPC
  const { error } = await supabase.rpc("publish_upload", { p_id: uploadId });
  if (error) return { ok: false, error: "שגיאה בפרסום: " + error.message };
  revalidatePath("/", "layout");
  return { ok: true, uploadId };
}

// ---------- עזרי מיפוי ----------

type AdminDb = ReturnType<typeof createAdminClient>;

async function resolveOrganizations(db: AdminDb, clients: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (clients.length === 0) return map;

  const { data: existing } = await db.from("organizations").select("id, excel_client_name");
  const byName = new Map<string, string>();
  for (const o of existing ?? []) byName.set(String(o.excel_client_name).toLowerCase(), o.id);

  const toCreate: string[] = [];
  for (const c of clients) {
    const id = byName.get(c.toLowerCase());
    if (id) map.set(c, id);
    else toCreate.push(c);
  }

  if (toCreate.length) {
    const { data: created } = await db
      .from("organizations")
      .insert(toCreate.map((name) => ({ name, excel_client_name: name, status: "active" })))
      .select("id, excel_client_name");
    for (const o of created ?? []) map.set(String(o.excel_client_name), o.id);
  }
  return map;
}
