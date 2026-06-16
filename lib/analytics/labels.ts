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

/** תיאור קצר של פרטי האירוע (חומר שנצפה, קישור, תוצאה וכו'). */
export function describeEvent(
  eventType: string,
  properties: Record<string, unknown> | null | undefined,
): string {
  const p = properties ?? {};
  if (eventType === "view_product" && p.product) return String(p.product);
  if (eventType === "click_edan" && p.url) return String(p.url);
  if (eventType === "click_registration" && p.url) return String(p.url);
  if (eventType === "install_outcome" && p.outcome) return String(p.outcome);
  if (eventType === "click_install" && p.platform) return String(p.platform);
  if (eventType === "view_screen" && p.org) return `רפת: ${p.org}`;
  return "";
}
