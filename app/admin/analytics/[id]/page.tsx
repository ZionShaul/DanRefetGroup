import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { eventLabel, describeEvent } from "@/lib/analytics/labels";

export const metadata = { title: "פעילות משתמש - סטטיסטיקה" };

type EventRow = {
  id: string;
  event_type: string;
  properties: Record<string, unknown> | null;
  path: string | null;
  created_at: string;
};

export default async function UserActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: events }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, organization:organizations(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("analytics_events")
      .select("id, event_type, properties, path, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const user = profile as { full_name: string; email: string; organization: { name: string } | null } | null;
  const rows = (events as EventRow[] | null) ?? [];

  return (
    <div className="space-y-5">
      <Link href="/admin/analytics" className="inline-block text-sm text-brand-primary underline">
        → חזרה לסטטיסטיקה
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-ink">פעילות משתמש</h1>
          <p className="mt-0.5 text-sm text-brand-muted">
            {user?.full_name ?? "—"}
            {user?.organization?.name ? ` · ${user.organization.name}` : ""}
            {user?.email ? ` · ${user.email}` : ""}
          </p>
        </div>
        <a
          href={`/api/analytics/export?user=${encodeURIComponent(id)}`}
          className="rounded-xl border border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary"
        >
          ייצוא פעילות לאקסל
        </a>
      </div>

      <section className="rounded-2xl border border-brand-line bg-brand-surface p-4">
        <h2 className="mb-2 text-base font-semibold text-brand-ink">
          500 הפעולות האחרונות ({rows.length})
        </h2>
        <div className="table-scroll rounded-xl border border-brand-line">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-brand-primary-light text-brand-primary-dark">
              <tr>
                <th className="px-3 py-2 text-right">זמן</th>
                <th className="px-3 py-2 text-right">פעולה</th>
                <th className="px-3 py-2 text-right">פרטים</th>
                <th className="px-3 py-2 text-right">מסך</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-brand-line/60">
                  <td className="px-3 py-2 text-brand-muted" dir="ltr">
                    {formatDateTime(e.created_at)}
                  </td>
                  <td className="px-3 py-2 text-brand-ink">{eventLabel(e.event_type)}</td>
                  <td className="px-3 py-2 text-brand-ink">
                    {describeEvent(e.event_type, e.properties) || "—"}
                  </td>
                  <td className="px-3 py-2 text-brand-muted" dir="ltr">
                    {e.path ?? "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-brand-muted">
                    אין פעילות מתועדת למשתמש זה.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
