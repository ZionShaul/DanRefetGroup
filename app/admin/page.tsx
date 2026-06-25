import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { MonthlyUpload } from "@/lib/types";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const { data: active } = await supabase
    .from("monthly_uploads")
    .select("*")
    .eq("status", "published")
    .maybeSingle();

  const [{ count: userCount }, { count: orgCount }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("organizations").select("id", { count: "exact", head: true }),
  ]);

  const upload = active as MonthlyUpload | null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-brand-ink">סקירה כללית</h1>

      <section className="rounded-2xl border border-brand-line bg-brand-surface p-5">
        <h2 className="mb-3 text-base font-semibold text-brand-ink">הטעינה הפעילה</h2>
        {upload ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="שם הטעינה" value={upload.title || upload.file_name} />
            <Stat label="פורסם בתאריך" value={formatDateTime(upload.published_at)} />
            <Stat label="שורות שנקלטו" value={formatNumber(upload.valid_rows)} />
            <Stat label="רפתות בקובץ" value={formatNumber(upload.organizations_count)} />
          </div>
        ) : (
          <div className="rounded-xl bg-brand-bg p-4 text-center text-sm text-brand-muted">
            עדיין לא פורסמה טעינה.{" "}
            <Link href="/admin/upload" className="text-brand-primary underline">
              טען/י קובץ ראשון
            </Link>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickLink href="/admin/upload" label="טעינת קובץ" icon="📄" />
        <QuickLink href="/admin/users" label={`משתמשים (${userCount ?? 0})`} icon="👥" />
        <QuickLink href="/admin/farms" label={`רפתות (${orgCount ?? 0})`} icon="🐄" />
        <QuickLink href="/admin/analytics" label="סטטיסטיקה" icon="📊" />
        <QuickLink href="/admin/settings" label="הגדרות מערכת" icon="⚙️" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-line bg-brand-bg p-3">
      <div className="text-xs text-brand-muted">{label}</div>
      <div className="mt-0.5 font-semibold text-brand-ink">{value}</div>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border border-brand-line bg-brand-surface p-5 text-center text-sm font-medium text-brand-ink hover:bg-brand-primary-light"
    >
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  );
}
