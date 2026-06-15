"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { verifyDevice } from "@/lib/actions/device";

const STORAGE_KEY = "dan_device_id";

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // ללא localStorage – מזהה זמני (ייחשב כמכשיר חדש בכל פעם)
    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function deviceLabel(): string {
  if (typeof navigator === "undefined") return "מכשיר";
  const ua = navigator.userAgent;
  const platform =
    /iphone|ipad|ipod/i.test(ua) ? "iPhone/iPad"
    : /android/i.test(ua) ? "Android"
    : /windows/i.test(ua) ? "Windows"
    : /mac/i.test(ua) ? "Mac"
    : "מכשיר";
  return `${platform}`;
}

/**
 * שומר על "מכשיר יחיד" למשתמשי רפת. אם החשבון כבר קשור למכשיר אחר –
 * מנתק את הסשן ומציג חסימה. מנהלים פטורים (נקבע בצד השרת).
 */
export default function DeviceGuard() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = getOrCreateDeviceId();
        const res = await verifyDevice(id, deviceLabel());
        if (cancelled) return;
        if (res.status === "blocked") {
          setBlocked(true);
          try {
            await createClient().auth.signOut();
          } catch {
            /* התעלמות */
          }
        }
      } catch {
        /* כשל בבדיקה – לא חוסמים כדי לא לנעול משתמש תקין */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg p-6">
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
    </div>
  );
}
