import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export const metadata = { title: "ניהול - משקי דן רכש רפתות" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-brand-line bg-brand-primary text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 items-center justify-center rounded-lg bg-white px-2 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/dan-farms.png" alt="משקי דן" className="h-6 w-auto" />
            </div>
            <div className="text-base font-bold">ניהול רכש רפתות</div>
          </div>
          <div className="text-xs text-white/80">{profile.full_name}</div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="rounded-2xl border border-brand-line bg-brand-surface p-2 lg:sticky lg:top-4">
            <AdminNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
