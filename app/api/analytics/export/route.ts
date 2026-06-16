import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventLabel, describeEvent, screenName } from "@/lib/analytics/labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 100000;

type EventRow = {
  created_at: string;
  event_type: string;
  properties: Record<string, unknown> | null;
  path: string | null;
  user: { full_name: string | null; email: string | null } | null;
  organization: { name: string | null } | null;
};

/** ייצוא אירועי הסטטיסטיקה לאקסל (מנהל בלבד). תומך ב-from/to/user. */
export async function GET(request: NextRequest) {
  const me = await getCurrentProfile();
  if (!me || me.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const user = sp.get("user");

  const db = createAdminClient();
  let query = db
    .from("analytics_events")
    .select(
      "created_at, event_type, properties, path, user:profiles(full_name, email), organization:organizations(name)",
    )
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (user) query = query.eq("user_id", user);

  const [{ data, error }, { data: orgs }] = await Promise.all([
    query,
    db.from("organizations").select("id, name"),
  ]);
  if (error) {
    return new NextResponse("שגיאה בשליפת הנתונים: " + error.message, { status: 500 });
  }

  const orgMap = new Map<string, string>(
    ((orgs as { id: string; name: string }[] | null) ?? []).map((o) => [o.id, o.name]),
  );
  const events = (data as unknown as EventRow[]) ?? [];
  const rows = events.map((e) => ({
    "תאריך": formatHe(e.created_at),
    "משתמש": e.user?.full_name ?? "",
    "אימייל": e.user?.email ?? "",
    "רפת": e.organization?.name ?? "",
    "סוג אירוע": eventLabel(e.event_type),
    "פרטים": describeEvent(e.event_type, e.properties, orgMap),
    "מסך": screenName(e.path),
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["תאריך", "משתמש", "אימייל", "רפת", "סוג אירוע", "פרטים", "מסך"],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "אירועים");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="analytics_${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

function formatHe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
