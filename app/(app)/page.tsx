import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveUpload, activeUploadLabel } from "@/lib/activeUpload";
import { getSystemSettings } from "@/lib/settings";
import { getOrgOrderLines, summarizeBalances, resolveTargetOrgId } from "@/lib/orders";
import { formatNumberWhole } from "@/lib/format";
import ActivePeriodBanner from "@/components/ActivePeriodBanner";
import InstallButton from "@/components/InstallButton";
import ClickSenseButton from "@/components/ClickSenseButton";
import FarmPicker from "@/components/FarmPicker";
import type { Organization } from "@/lib/types";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const profile = await requireUser();
  const { org: orgParam } = await searchParams;
  const activeUpload = await getActiveUpload();
  const label = activeUploadLabel(activeUpload);
  const settings = await getSystemSettings();

  const targetOrgId = resolveTargetOrgId(profile, orgParam);

  // מנהל ללא בחירת רפת – הצגת בורר רפתות
  if (profile.role === "admin" && !targetOrgId) {
    const supabase = await createClient();
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .order("name");
    return (
      <div className="space-y-6">
        <ActivePeriodBanner label={label} />
        <div className="pt-2 text-center">
          <h1 className="text-xl font-bold text-brand-ink">בחירת רפת</h1>
          <p className="mt-1 text-sm text-brand-muted">בחר/י רפת כדי לראות את היתרות שלה</p>
        </div>
        <FarmPicker farms={(orgs as Pick<Organization, "id" | "name">[]) ?? []} />
        <InstallButton />
      </div>
    );
  }

  if (!targetOrgId) {
    return (
      <div className="space-y-6">
        <ActivePeriodBanner label={label} />
        <div className="rounded-2xl border border-brand-line bg-brand-surface p-6 text-center text-sm text-brand-muted">
          המשתמש אינו משויך לרפת. פנה/י למנהל המערכת.
        </div>
      </div>
    );
  }

  const lines = await getOrgOrderLines(targetOrgId);
  const balances = summarizeBalances(lines, settings.min_balance ?? 14);

  // שם הרפת המוצגת (למנהל)
  let orgName: string | null = profile.organization?.name ?? null;
  if (profile.role === "admin") {
    const supabase = await createClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", targetOrgId)
      .maybeSingle();
    orgName = (org as { name: string } | null)?.name ?? null;
  }

  const qs = profile.role === "admin" ? `?org=${encodeURIComponent(targetOrgId)}` : "";

  return (
    <div className="space-y-5">
      <ActivePeriodBanner label={label} />

      <div className="pt-1 text-center">
        <h1 className="text-xl font-bold text-brand-ink">היתרות שלי</h1>
        {orgName && <p className="mt-0.5 text-sm text-brand-muted">{orgName}</p>}
        {profile.role === "admin" && (
          <Link href="/" className="mt-1 inline-block text-xs text-brand-primary underline">
            ← בחירת רפת אחרת
          </Link>
        )}
      </div>

      {!label && (
        <div className="rounded-2xl border border-brand-line bg-brand-surface p-6 text-center text-sm text-brand-muted">
          טרם פורסמו נתונים. פנה/י למנהל המערכת.
        </div>
      )}

      {label && balances.length === 0 && (
        <div className="rounded-2xl border border-brand-line bg-brand-surface p-6 text-center text-sm text-brand-muted">
          אין יתרות פתוחות לרפת זו בטעינה הנוכחית.
        </div>
      )}

      {balances.length > 0 && (
        <>
          {/* כרטיס לכל חומר */}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {balances.map((b) => (
              <li key={b.product}>
                <Link
                  href={`/product/${encodeURIComponent(b.product)}${qs}`}
                  className="flex items-center justify-between rounded-2xl border border-brand-line bg-brand-surface p-4 shadow-sm transition-colors hover:bg-brand-primary-light"
                >
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-brand-ink">
                      {b.product}
                    </div>
                    <div className="text-xs text-brand-muted">
                      {b.lineCount} שורות · לחצ/י לפירוט
                    </div>
                  </div>
                  <div className="shrink-0 text-left">
                    <div className="text-2xl font-bold text-brand-primary" dir="ltr">
                      {formatNumberWhole(b.balance)}
                    </div>
                    <div className="text-[11px] text-brand-muted">טון</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <ClickSenseButton url={settings.clicksense_url} enabled={settings.clicksense_enabled} />

      <InstallButton />
    </div>
  );
}
