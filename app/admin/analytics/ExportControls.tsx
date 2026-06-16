"use client";

import { useState } from "react";

/** בקרות ייצוא אירועים לאקסל (טווח תאריכים אופציונלי). */
export default function ExportControls() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function exportXlsx() {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to + "T23:59:59").toISOString());
    const qs = params.toString();
    window.location.href = `/api/analytics/export${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-brand-muted">
        מתאריך
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="mt-0.5 block rounded-lg border border-brand-line bg-white px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs text-brand-muted">
        עד תאריך
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mt-0.5 block rounded-lg border border-brand-line bg-white px-2 py-1.5 text-sm"
        />
      </label>
      <button
        onClick={exportXlsx}
        className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
      >
        ⬇ ייצוא לאקסל
      </button>
    </div>
  );
}
