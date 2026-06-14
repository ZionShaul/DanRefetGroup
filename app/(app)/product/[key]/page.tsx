import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrgOrderLines, resolveTargetOrgId } from "@/lib/orders";
import { formatNumberWhole, formatMonth, formatDate, formatNumber } from "@/lib/format";
import type { OrderLine } from "@/lib/types";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const profile = await requireUser();
  const { key } = await params;
  const { org: orgParam } = await searchParams;
  const product = decodeURIComponent(key);

  const targetOrgId = resolveTargetOrgId(profile, orgParam);
  if (!targetOrgId) redirect("/");

  const qs = profile.role === "admin" ? `?org=${encodeURIComponent(targetOrgId)}` : "";

  const lines = (await getOrgOrderLines(targetOrgId)).filter((l) => l.product === product);

  // סיכום לפי (חודש אספקה, ספק) – כמו טבלת הסיכום באקסל
  const sumMap = new Map<
    string,
    { month: string | null; supplier: string | null; balance: number }
  >();
  for (const l of lines) {
    const k = `${l.delivery_month ?? ""}||${l.supplier ?? ""}`;
    const cur = sumMap.get(k) ?? {
      month: l.delivery_month,
      supplier: l.supplier,
      balance: 0,
    };
    cur.balance += l.balance ?? 0;
    sumMap.set(k, cur);
  }
  const summary = [...sumMap.values()]
    .filter((s) => Math.round(s.balance) !== 0)
    .sort((a, b) => (a.month ?? "").localeCompare(b.month ?? ""));
  const subtotal = summary.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="space-y-5">
      <Link href={`/${qs}`} className="inline-block text-sm text-brand-primary underline">
        → חזרה ליתרות
      </Link>

      <div>
        <h1 className="text-xl font-bold text-brand-ink">{product}</h1>
        <p className="mt-0.5 text-sm text-brand-muted">פירוט יתרה למשיכה לפי חודש וספק</p>
      </div>

      {/* טבלת סיכום */}
      <section className="rounded-2xl border border-brand-line bg-brand-surface p-4">
        <h2 className="mb-2 text-base font-semibold text-brand-ink">סיכום יתרה</h2>
        <div className="table-scroll rounded-xl border border-brand-line">
          <table className="w-full min-w-[360px] text-sm">
            <thead className="bg-brand-primary-light text-brand-primary-dark">
              <tr>
                <th className="px-3 py-2 text-right">חודש אספקה</th>
                <th className="px-3 py-2 text-right">ספק</th>
                <th className="px-3 py-2 text-left">יתרה (טון)</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r, i) => (
                <tr key={i} className="border-t border-brand-line/60">
                  <td className="px-3 py-2">{formatMonth(r.month)}</td>
                  <td className="px-3 py-2">{r.supplier ?? "—"}</td>
                  <td className="px-3 py-2 text-left" dir="ltr">
                    {formatNumberWhole(r.balance)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-brand-primary/40 bg-brand-primary-light font-bold text-brand-primary-dark">
                <td className="px-3 py-2" colSpan={2}>
                  {`סה"כ ${product}`}
                </td>
                <td className="px-3 py-2 text-left" dir="ltr">
                  {formatNumberWhole(subtotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* שורות מפורטות */}
      <section className="rounded-2xl border border-brand-line bg-brand-surface p-4">
        <h2 className="mb-2 text-base font-semibold text-brand-ink">שורות הזמנה ({lines.length})</h2>
        <div className="table-scroll rounded-xl border border-brand-line">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="bg-brand-bg text-brand-muted">
              <tr>
                <th className="px-2 py-2 text-right">ספק</th>
                <th className="px-2 py-2 text-right">הזמנה</th>
                <th className="px-2 py-2 text-right">תאריך הזמנה</th>
                <th className="px-2 py-2 text-right">חודש אספקה</th>
                <th className="px-2 py-2 text-left">מחיר</th>
                <th className="px-2 py-2 text-left">טון מוזמן</th>
                <th className="px-2 py-2 text-left">נלקח</th>
                <th className="px-2 py-2 text-left">יתרה</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l: OrderLine) => (
                <tr key={l.id} className="border-t border-brand-line/60">
                  <td className="px-2 py-2">{l.supplier ?? "—"}</td>
                  <td className="px-2 py-2" dir="ltr">{l.order_no ?? "—"}</td>
                  <td className="px-2 py-2" dir="ltr">{formatDate(l.order_date)}</td>
                  <td className="px-2 py-2" dir="ltr">{formatMonth(l.delivery_month)}</td>
                  <td className="px-2 py-2 text-left" dir="ltr">{formatNumber(l.price)}</td>
                  <td className="px-2 py-2 text-left" dir="ltr">{formatNumber(l.tons_ordered)}</td>
                  <td className="px-2 py-2 text-left" dir="ltr">{formatNumber(l.qty_taken)}</td>
                  <td className="px-2 py-2 text-left font-semibold text-brand-primary" dir="ltr">
                    {formatNumber(l.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
