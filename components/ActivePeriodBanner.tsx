// באנר "תקופה פעילה" – מציג למשתמש לאיזו טעינה מתייחסים הנתונים הנוכחיים.
export default function ActivePeriodBanner({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-brand-line bg-brand-primary-light px-4 py-2 text-center text-sm text-brand-primary-dark">
      <span aria-hidden>🗓️</span>
      <span>
        נתונים מעודכנים לפי: <span className="font-semibold">{label}</span>
      </span>
    </div>
  );
}
