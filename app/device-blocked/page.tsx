export const metadata = { title: "מכשיר חסום - משקי דן" };

export default function DeviceBlockedPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-brand-line bg-brand-surface p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-danger/10 text-2xl">
          🔒
        </div>
        <h1 className="text-lg font-bold text-brand-ink">החשבון משויך למכשיר אחר</h1>
        <p className="mt-2 text-sm text-brand-muted">
          חשבון זה כבר בשימוש במכשיר אחר. לקבלת גישה ממכשיר זה פנה/י למנהל המערכת לאיפוס המכשיר.
        </p>
        <a
          href="/login"
          className="mt-4 inline-block rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          חזרה למסך ההתחברות
        </a>
      </div>
    </main>
  );
}
