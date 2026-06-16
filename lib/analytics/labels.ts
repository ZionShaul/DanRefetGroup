// תוויות אירועים בעברית + תיאור קצר של פרטי האירוע (משותף למסכי הסטטיסטיקה והייצוא).

export const EVENT_LABELS: Record<string, string> = {
  login: "כניסה",
  view_screen: "צפיית מסך",
  view_product: "צפייה בחומר",
  click_edan: "לחיצת עידן חדש",
  click_whatsapp: "לחיצת וואטסאפ",
  click_registration: "לחיצת בקשת רישום",
  click_install: "לחיצת התקנה",
  install_outcome: "תוצאת התקנה",
};

export function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

const SCREEN_NAMES: Record<string, string> = {
  "/": "מסך הבית / היתרות",
  "/login": "התחברות",
  "/device-blocked": "מכשיר חסום",
  "/admin": "ניהול – סקירה",
  "/admin/upload": "טעינת קובץ",
  "/admin/users": "ניהול משתמשים",
  "/admin/analytics": "סטטיסטיקה",
  "/admin/settings": "הגדרות מערכת",
};

/** שם מסך קריא לפי הנתיב (מפענח שמות חומרים בנתיב הפירוט). */
export function screenName(path: string | null | undefined): string {
  if (!path) return "—";
  const clean = path.split("?")[0];
  if (clean.startsWith("/product/")) {
    const enc = clean.slice("/product/".length);
    let name = enc;
    try {
      name = decodeURIComponent(enc);
    } catch {
      /* נשאר כפי שהוא */
    }
    return `פירוט חומר: ${name}`;
  }
  if (clean.startsWith("/admin/analytics/")) return "פעילות משתמש";
  return SCREEN_NAMES[clean] ?? clean;
}

/**
 * תיאור קצר של פרטי האירוע (חומר שנצפה, קישור, תוצאה וכו').
 * orgMap (מזהה רפת → שם) משמש להצגת שם הרפת במקום הקוד.
 */
export function describeEvent(
  eventType: string,
  properties: Record<string, unknown> | null | undefined,
  orgMap?: Map<string, string>,
): string {
  const p = properties ?? {};
  if (eventType === "view_product" && p.product) return String(p.product);
  if (eventType === "click_edan" && p.url) return String(p.url);
  if (eventType === "click_registration" && p.url) return String(p.url);
  if (eventType === "install_outcome" && p.outcome) return String(p.outcome);
  if (eventType === "click_install" && p.platform) return String(p.platform);
  if (eventType === "view_screen" && p.org) {
    const id = String(p.org);
    return `רפת: ${orgMap?.get(id) ?? id}`;
  }
  return "";
}
