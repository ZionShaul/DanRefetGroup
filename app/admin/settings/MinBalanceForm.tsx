"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMinBalance } from "@/lib/actions/settings";

export default function MinBalanceForm({ value }: { value: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const res = await updateMinBalance(new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) setMsg({ type: "error", text: res.error });
    else {
      setMsg({ type: "ok", text: "ההגדרות נשמרו." });
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-brand-line bg-brand-surface p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-brand-ink">סף יתרה מינימלי לתצוגה</h2>
        <p className="mt-1 text-sm text-brand-muted">
          מוצגות ומסוכמות רק שורות עם יתרה למשיכה <span className="font-semibold">גדולה</span> מהערך
          הזה (בטון). שורות עם יתרה נמוכה יותר לא יוצגו ולא ייכללו בסיכומים.
        </p>
      </div>

      <label className="block max-w-[200px]">
        <span className="mb-1 block text-sm font-medium text-brand-ink">סף מינימלי (טון)</span>
        <input
          name="min_balance"
          type="number"
          min={0}
          step="any"
          dir="ltr"
          defaultValue={value}
          className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
        />
      </label>

      {msg && (
        <p className={`text-sm ${msg.type === "ok" ? "text-brand-primary" : "text-brand-danger"}`}>
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "שומר..." : "שמירה"}
      </button>
    </form>
  );
}
