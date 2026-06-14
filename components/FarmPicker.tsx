"use client";

import { useState } from "react";
import Link from "next/link";

interface Farm {
  id: string;
  name: string;
}

/** רשימת רפתות לבחירה (למנהל), עם סינון לפי שם. */
export default function FarmPicker({ farms }: { farms: Farm[] }) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? farms.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()))
    : farms;

  if (farms.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-line bg-brand-surface p-6 text-center text-sm text-brand-muted">
        עדיין אין רפתות. טען/י קובץ במסך הניהול.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש רפת לפי שם"
        className="w-full rounded-xl border border-brand-line bg-white px-4 py-3 text-base text-brand-ink outline-none focus:border-brand-primary"
      />
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filtered.map((f) => (
          <li key={f.id}>
            <Link
              href={`/?org=${encodeURIComponent(f.id)}`}
              className="block rounded-xl border border-brand-line bg-brand-surface px-4 py-3 text-base font-medium text-brand-ink transition-colors hover:bg-brand-primary-light"
            >
              {f.name}
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-brand-muted">לא נמצאו רפתות תואמות.</li>
        )}
      </ul>
    </div>
  );
}
