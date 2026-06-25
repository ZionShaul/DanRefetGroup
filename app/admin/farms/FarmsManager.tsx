"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganization, deleteOrganization } from "@/lib/actions/users";
import { formatNumber } from "@/lib/format";
import type { FarmStat } from "./page";

export default function FarmsManager({ farms }: { farms: FarmStat[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [newName, setNewName] = useState("");

  async function addFarm() {
    if (!newName.trim()) return;
    setError(null);
    setMsg(null);
    setPending(true);
    const res = await createOrganization(newName);
    setPending(false);
    if (!res.ok) return setError(res.error);
    setNewName("");
    setMsg("הרפת נוספה.");
    router.refresh();
  }

  async function removeFarm(f: FarmStat) {
    // אזהרה כפולה כשיש הזמנות פתוחות או משתמשים משויכים
    const warnings: string[] = [];
    if (f.open_count > 0) warnings.push(`${f.open_count} שורות עם יתרה פתוחה`);
    if (f.users_count > 0) warnings.push(`${f.users_count} משתמשים משויכים`);

    if (warnings.length > 0) {
      if (
        !confirm(
          `שים לב: לרפת "${f.name}" יש ${warnings.join(" ו-")}.\n` +
            `מחיקה תסיר את הרפת ואת נתוני ההזמנות שלה, והמשתמשים יהפכו ללא-רפת. להמשיך?`,
        )
      )
        return;
      if (!confirm(`אישור סופי: למחוק לצמיתות את הרפת "${f.name}"? הפעולה בלתי הפיכה.`)) return;
    } else {
      if (!confirm(`למחוק את הרפת "${f.name}"? הפעולה בלתי הפיכה.`)) return;
    }

    setError(null);
    setMsg(null);
    setPending(true);
    const res = await deleteOrganization(f.id);
    setPending(false);
    if (!res.ok) return setError(res.error);
    setMsg(`הרפת "${f.name}" נמחקה.`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-brand-ink">ניהול רפתות</h1>
      <p className="text-sm text-brand-muted">
        רפתות נוצרות אוטומטית בטעינת הקובץ לפי עמודת &quot;ארגון&quot;. ניתן למחוק רפתות שאינן רלוונטיות.
      </p>

      {error && (
        <p className="rounded-xl bg-brand-danger/10 px-4 py-2 text-sm text-brand-danger">{error}</p>
      )}
      {msg && (
        <p className="rounded-xl bg-brand-primary-light px-4 py-2 text-sm text-brand-primary-dark">
          {msg}
        </p>
      )}

      {/* הוספת רפת */}
      <div className="flex items-end gap-2 rounded-2xl border border-brand-line bg-brand-surface p-4">
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium text-brand-ink">הוספת רפת</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="שם הרפת (כפי שמופיע בעמודת הארגון בקובץ)"
            className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
          />
        </label>
        <button
          onClick={addFarm}
          disabled={pending}
          className="rounded-xl border border-brand-primary px-4 py-2.5 text-sm font-semibold text-brand-primary disabled:opacity-60"
        >
          הוספה
        </button>
      </div>

      <div className="table-scroll rounded-2xl border border-brand-line bg-brand-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-brand-primary-light text-brand-primary-dark">
            <tr>
              <th className="px-3 py-2 text-right">רפת</th>
              <th className="px-3 py-2 text-right">משתמשים</th>
              <th className="px-3 py-2 text-right">שורות הזמנה</th>
              <th className="px-3 py-2 text-right">יתרות פתוחות</th>
              <th className="px-3 py-2 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {farms.map((f) => (
              <tr key={f.id} className="border-t border-brand-line/60">
                <td className="px-3 py-2 text-brand-ink">{f.name}</td>
                <td className="px-3 py-2 text-brand-ink">{formatNumber(f.users_count)}</td>
                <td className="px-3 py-2 text-brand-ink">{formatNumber(f.order_count)}</td>
                <td className="px-3 py-2">
                  {f.open_count > 0 ? (
                    <span className="rounded-full bg-brand-warning/10 px-2 py-0.5 text-xs font-medium text-brand-warning">
                      {formatNumber(f.open_count)} פתוחות
                    </span>
                  ) : (
                    <span className="text-brand-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => removeFarm(f)}
                    disabled={pending}
                    className="rounded-lg border border-brand-danger px-2 py-1 text-xs font-semibold text-brand-danger disabled:opacity-50"
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
            {farms.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-brand-muted">
                  אין רפתות עדיין. הן ייווצרו בטעינת הקובץ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
