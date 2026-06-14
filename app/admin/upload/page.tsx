import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatNumber, formatMonth } from "@/lib/format";
import UploadForm from "./UploadForm";
import PublishButton from "./PublishButton";
import type { MonthlyUpload } from "@/lib/types";

export default async function AdminUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <div className="space-y-6">
      <UploadForm />
      {id && <UploadSummary uploadId={id} />}
    </div>
  );
}

async function UploadSummary({ uploadId }: { uploadId: string }) {
  const supabase = await createClient();

  const { data: uploadData } = await supabase
    .from("monthly_uploads")
    .select("*, uploader:profiles!monthly_uploads_uploaded_by_fkey(full_name)")
    .eq("id", uploadId)
    .single();

  if (!uploadData) {
    return <p className="text-brand-muted">לא נמצאה טעינה.</p>;
  }
  const upload = uploadData as unknown as MonthlyUpload & {
    uploader: { full_name: string } | null;
  };

  const [{ data: sample }, { data: rejected }] = await Promise.all([
    supabase
      .from("order_lines")
      .select("id, supplier, product, delivery_month, tons_ordered, balance, organization:organizations(name)")
      .eq("upload_id", uploadId)
      .limit(10),
    supabase.from("rejected_rows").select("id, reason").eq("upload_id", uploadId).limit(8),
  ]);

  type SampleRow = {
    id: string;
    supplier: string | null;
    product: string;
    delivery_month: string | null;
    tons_ordered: number | null;
    balance: number | null;
    organization: { name: string } | null;
  };
  const sampleRows = (sample as unknown as SampleRow[]) ?? [];
  const rejectedRows = (rejected as unknown as { id: string; reason: string }[]) ?? [];

  const stats: [string, string][] = [
    ["שם הטעינה", upload.title || upload.file_name],
    ["שם הקובץ", upload.file_name],
    ["תאריך ושעת טעינה", formatDateTime(upload.uploaded_at)],
    ["נטען על ידי", upload.uploader?.full_name ?? "—"],
    ["מספר שורות בקובץ", formatNumber(upload.total_rows)],
    ["שורות שנקלטו", formatNumber(upload.valid_rows)],
    ["שורות שהוחרגו", formatNumber(upload.rejected_rows)],
    ["רפתות שזוהו", formatNumber(upload.organizations_count)],
    ["חומרים שזוהו", formatNumber(upload.products_count)],
  ];

  const statusLabel =
    upload.status === "published"
      ? "פעילה"
      : upload.status === "historical"
        ? "היסטורית"
        : "טיוטה (טרם פורסמה)";

  return (
    <section className="space-y-5 rounded-2xl border border-brand-line bg-brand-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-brand-ink">סיכום טעינה</h2>
        <span className="rounded-full bg-brand-bg px-3 py-1 text-xs font-medium text-brand-muted">
          {statusLabel}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-brand-line bg-brand-bg p-3">
            <dt className="text-xs text-brand-muted">{k}</dt>
            <dd className="mt-0.5 font-semibold text-brand-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand-ink">תצוגה מקדימה</h3>
        <div className="table-scroll rounded-xl border border-brand-line">
          <table className="w-full min-w-[560px] text-xs">
            <thead className="bg-brand-primary-light text-brand-primary-dark">
              <tr>
                <th className="px-2 py-1.5 text-right">רפת</th>
                <th className="px-2 py-1.5 text-right">ספק</th>
                <th className="px-2 py-1.5 text-right">חומר</th>
                <th className="px-2 py-1.5 text-right">חודש אספקה</th>
                <th className="px-2 py-1.5 text-left">טון מוזמן</th>
                <th className="px-2 py-1.5 text-left">יתרה</th>
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((r) => (
                <tr key={r.id} className="border-t border-brand-line/60">
                  <td className="px-2 py-1.5">{r.organization?.name ?? "—"}</td>
                  <td className="px-2 py-1.5">{r.supplier ?? "—"}</td>
                  <td className="px-2 py-1.5">{r.product}</td>
                  <td className="px-2 py-1.5" dir="ltr">{formatMonth(r.delivery_month)}</td>
                  <td className="px-2 py-1.5 text-left" dir="ltr">{formatNumber(r.tons_ordered)}</td>
                  <td className="px-2 py-1.5 text-left" dir="ltr">{formatNumber(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectedRows.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-brand-ink">דוגמת חריגות</h3>
          <ul className="space-y-1 text-xs text-brand-muted">
            {rejectedRows.map((r) => (
              <li key={r.id} className="rounded-lg bg-brand-bg px-3 py-1.5">
                {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PublishButton uploadId={uploadId} alreadyPublished={upload.status === "published"} />
    </section>
  );
}
