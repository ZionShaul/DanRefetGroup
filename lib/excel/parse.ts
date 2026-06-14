import * as XLSX from "xlsx";

// ===== פרסור קובץ הספקים המאוחד (merged_suppliers_*.xlsx) =====
// העמודות הקנוניות (כפי שנוצרות ב-merge_suppliers.py):
//   ספק · ארגון · פריט · שם פריט · הזמנה · תאריך הזמנה · חודש אספקה ·
//   מחיר · טון מוזמן · הזמנה במשלוחים · יתרה למשיכה · כמות שנלקחה

export interface RawOrderLine {
  client: string; // ארגון
  supplier: string | null; // ספק
  itemCode: string | null; // פריט
  product: string; // שם פריט
  orderNo: string | null; // הזמנה
  orderDate: string | null; // תאריך הזמנה
  deliveryMonth: string | null; // חודש אספקה
  price: number | null; // מחיר
  tonsOrdered: number | null; // טון מוזמן
  orderInShipments: number | null; // הזמנה במשלוחים
  balance: number | null; // יתרה למשיכה
  qtyTaken: number | null; // כמות שנלקחה
}

export interface RejectedParse {
  reason: string;
  raw: Record<string, unknown>;
}

export interface ParseResult {
  valid: RawOrderLine[];
  rejected: RejectedParse[];
  totalRows: number;
  clients: string[];
  products: string[];
}

type Field =
  | "supplier"
  | "client"
  | "itemCode"
  | "product"
  | "orderNo"
  | "orderDate"
  | "deliveryMonth"
  | "price"
  | "tonsOrdered"
  | "orderInShipments"
  | "balance"
  | "qtyTaken";

// מילים נרדפות לכותרות (תומך גם בשמות מקור של הספקים, ליתר ביטחון)
const HEADER_SYNONYMS: Record<Field, string[]> = {
  supplier: ["ספק", "שם ספק"],
  client: ["ארגון", "לקוח", "שם לקוח"],
  itemCode: ["פריט", "מקט", "מק״ט", 'מק"ט', "קוד פריט"],
  product: ["שם פריט", "תיאור מוצר", "תאור מוצר", "מוצר", "שם חומר"],
  orderNo: ["הזמנה", "מספר הזמנה"],
  orderDate: ["תאריך הזמנה"],
  deliveryMonth: ["חודש אספקה", "ת. אספקה", "תאריך אספקה", "חודש"],
  price: ["מחיר", "מחיר ליחידה"],
  tonsOrdered: ["טון מוזמן", "כמות", "כמות מקורית"],
  orderInShipments: ["הזמנה במשלוחים"],
  balance: ["יתרה למשיכה", "יתרה לאספקה", "יתרת כמות", "יתרה"],
  qtyTaken: ["כמות שנלקחה", "סופק"],
};

// כותרות/תוכן של בלוק "סיכום הזמנות" שיש לדלג עליו אם קיים בקובץ
const SUMMARY_MARKERS = ["סיכום הזמנות", 'סה"כ', "סהכ", "סה״כ"];

/** ניקוי כותרת להשוואה: הסרת גרשיים/רווחים כפולים. */
export function normalizeHeader(s: string): string {
  return String(s ?? "")
    .replace(/["'׳״‘’“”]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** ממפה כל שדה במערכת לכותרת בפועל בקובץ. */
export function buildHeaderMap(headers: string[]): Partial<Record<Field, string>> {
  const norm = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));
  const map: Partial<Record<Field, string>> = {};
  (Object.keys(HEADER_SYNONYMS) as Field[]).forEach((field) => {
    for (const syn of HEADER_SYNONYMS[field]) {
      const ns = normalizeHeader(syn);
      const hit = norm.find((h) => h.n === ns) ?? norm.find((h) => h.n.includes(ns) || ns.includes(h.n));
      if (hit) {
        map[field] = hit.raw;
        break;
      }
    }
  });
  return map;
}

/** המרת ערך תא למספר (תומך במחרוזות עם פסיקים/מטבע). null אם ריק/לא מספרי. */
export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  const cleaned = String(value).replace(/[^\d.,\-]/g, "").replace(/,/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number.parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

/**
 * נירמול תאריך ל-YYYY-MM-DD.
 * תומך ב-Date, "DD/MM/YYYY", "DD/MM/YY", "MM/YYYY" (חודש אספקה → היום ה-1 בחודש).
 */
export function toDateString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (s === "") return null;

  // MM/YYYY  (חודש אספקה)
  let m = s.match(/^(\d{1,2})[/\-.](\d{4})$/);
  if (m) {
    const month = m[1].padStart(2, "0");
    return `${m[2]}-${month}-01`;
  }
  // DD/MM/YYYY  או  DD/MM/YY
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    let year = m[3];
    if (year.length === 2) year = "20" + year;
    return `${year}-${month}-${day}`;
  }
  // YYYY-MM-DD וכד'
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/** האם השורה היא שורת סיכום ("סיכום הזמנות" / סה"כ) שיש לדלג עליה. */
function isSummaryRow(rec: Record<string, unknown>): boolean {
  const firstVals = Object.values(rec)
    .map((v) => normalizeHeader(String(v ?? "")))
    .filter(Boolean);
  return firstVals.some((v) => SUMMARY_MARKERS.some((mk) => v.includes(normalizeHeader(mk))));
}

/** סיווג רשומות לתקינות/חריגות. ניתן לבדיקה ללא קובץ אמיתי. */
export function classifyRows(
  records: Record<string, unknown>[],
  headerMap: Partial<Record<Field, string>>,
): ParseResult {
  const valid: RawOrderLine[] = [];
  const rejected: RejectedParse[] = [];
  const clients = new Set<string>();
  const products = new Set<string>();

  const get = (rec: Record<string, unknown>, field: Field): unknown => {
    const key = headerMap[field];
    return key ? rec[key] : undefined;
  };

  for (const rec of records) {
    // דילוג על שורות ריקות לחלוטין
    if (Object.values(rec).every((v) => v === null || v === undefined || v === "")) continue;
    // דילוג על בלוק הסיכום אם קיים
    if (isSummaryRow(rec)) continue;

    const client = toText(get(rec, "client"));
    const product = toText(get(rec, "product"));

    if (!client || !product) {
      rejected.push({ reason: "שורה ללא ארגון או ללא שם פריט", raw: rec });
      continue;
    }

    clients.add(client);
    products.add(product);
    valid.push({
      client,
      supplier: toText(get(rec, "supplier")),
      itemCode: toText(get(rec, "itemCode")),
      product,
      orderNo: toText(get(rec, "orderNo")),
      orderDate: toDateString(get(rec, "orderDate")),
      deliveryMonth: toDateString(get(rec, "deliveryMonth")),
      price: parseNumber(get(rec, "price")),
      tonsOrdered: parseNumber(get(rec, "tonsOrdered")),
      orderInShipments: parseNumber(get(rec, "orderInShipments")),
      balance: parseNumber(get(rec, "balance")),
      qtyTaken: parseNumber(get(rec, "qtyTaken")),
    });
  }

  return {
    valid,
    rejected,
    totalRows: records.length,
    clients: [...clients],
    products: [...products],
  };
}

/** פרסור מלא של קובץ אקסל (Buffer/ArrayBuffer) – צד שרת. */
export function parseExcel(data: ArrayBuffer | Uint8Array): ParseResult {
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { valid: [], rejected: [], totalRows: 0, clients: [], products: [] };
  }
  const sheet = wb.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  const headerMap = buildHeaderMap(headers);
  return classifyRows(records, headerMap);
}
