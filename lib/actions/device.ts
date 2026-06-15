"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeviceStatus = { status: "ok" | "blocked" | "exempt" };

/**
 * אכיפת "מכשיר ראשון מנצח" עבור משתמשי רפת.
 * - מנהל: פטור.
 * - אין מכשיר קשור: קושר את המכשיר הנוכחי (claim).
 * - מכשיר תואם: מאשר.
 * - מכשיר אחר: חוסם.
 */
export async function verifyDevice(deviceId: string, label: string): Promise<DeviceStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "blocked" };

  // ולידציה בסיסית של מזהה המכשיר
  if (typeof deviceId !== "string" || deviceId.length < 10 || deviceId.length > 100) {
    return { status: "blocked" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active_device_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { status: "blocked" };
  if (profile.role === "admin") return { status: "exempt" };

  const bound = profile.active_device_id as string | null;

  if (bound && bound === deviceId) return { status: "ok" };
  if (bound && bound !== deviceId) return { status: "blocked" };

  // אין מכשיר קשור – קושר את המכשיר הנוכחי
  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({
      active_device_id: deviceId,
      active_device_label: (label || "").slice(0, 120),
      device_bound_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .is("active_device_id", null); // הגנה מפני מרוץ – קושר רק אם עדיין ריק

  if (error) return { status: "blocked" };

  // אימות סופי: ודא שהמכשיר שנקשר הוא שלנו (במקרה של מרוץ בו מכשיר אחר הקדים)
  const { data: after } = await db
    .from("profiles")
    .select("active_device_id")
    .eq("id", user.id)
    .single();
  if ((after?.active_device_id as string | null) === deviceId) return { status: "ok" };
  return { status: "blocked" };
}
