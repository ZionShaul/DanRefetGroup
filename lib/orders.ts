import { createClient } from "@/lib/supabase/server";
import type { OrderLine, ProductBalance, ProfileWithOrg } from "@/lib/types";

/** מזהה הטעינה הפעילה (דרך RPC security definer – נגיש גם למשתמש רגיל). */
export async function getActiveUploadId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_active_upload");
  return (data as { id: string }[] | null)?.[0]?.id ?? null;
}

/**
 * שורות ההזמנה של רפת מהטעינה הפעילה.
 * משתמש רגיל: RLS מגביל לרפת שלו ממילא; מנהל: מסונן לפי orgId הנבחר.
 */
export async function getOrgOrderLines(orgId: string): Promise<OrderLine[]> {
  const uploadId = await getActiveUploadId();
  if (!uploadId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_lines")
    .select("*")
    .eq("organization_id", orgId)
    .eq("upload_id", uploadId)
    .order("product", { ascending: true });
  return (data as OrderLine[]) ?? [];
}

/** סיכום יתרה למשיכה לכל חומר (שם פריט). מוצגים רק חומרים עם יתרה שונה מ-0. */
export function summarizeBalances(lines: OrderLine[]): ProductBalance[] {
  const map = new Map<string, ProductBalance>();
  for (const l of lines) {
    const cur = map.get(l.product) ?? { product: l.product, balance: 0, lineCount: 0 };
    cur.balance += l.balance ?? 0;
    cur.lineCount += 1;
    map.set(l.product, cur);
  }
  return [...map.values()]
    .filter((p) => Math.round(p.balance) !== 0)
    .sort((a, b) => b.balance - a.balance);
}

/**
 * קובע את הרפת שיש להציג:
 * - מנהל: לפי הפרמטר orgParam (בחירת רפת); אם לא נבחרה – null.
 * - משתמש רגיל: הרפת המשויכת אליו.
 */
export function resolveTargetOrgId(
  profile: ProfileWithOrg,
  orgParam?: string,
): string | null {
  if (profile.role === "admin") return orgParam || null;
  return profile.organization_id;
}
