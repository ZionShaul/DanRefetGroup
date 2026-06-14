// בדיקות יחידה לפרסור קובץ הספקים המאוחד.
// הרצה: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyRows, buildHeaderMap, toDateString, parseNumber } from "./parse.ts";

const HEADERS = [
  "ספק", "ארגון", "פריט", "שם פריט", "הזמנה", "תאריך הזמנה",
  "חודש אספקה", "מחיר", "טון מוזמן", "הזמנה במשלוחים", "יתרה למשיכה", "כמות שנלקחה",
];

function rec(o) {
  return {
    "ספק": o.supplier ?? "אמבר",
    "ארגון": o.client ?? "יהל",
    "פריט": o.item ?? "0072",
    "שם פריט": o.product ?? "תירס גרוס",
    "הזמנה": o.order ?? "12015972",
    "תאריך הזמנה": o.orderDate ?? "03/07/25",
    "חודש אספקה": o.month ?? "09/2025",
    "מחיר": o.price ?? 266,
    "טון מוזמן": o.tons ?? 40,
    "הזמנה במשלוחים": o.ship ?? null,
    "יתרה למשיכה": o.balance ?? 40,
    "כמות שנלקחה": o.taken ?? 0,
  };
}

test("buildHeaderMap ממפה את העמודות הקנוניות", () => {
  const map = buildHeaderMap(HEADERS);
  assert.equal(map.client, "ארגון");
  assert.equal(map.product, "שם פריט");
  assert.equal(map.balance, "יתרה למשיכה");
  assert.equal(map.tonsOrdered, "טון מוזמן");
  assert.equal(map.deliveryMonth, "חודש אספקה");
});

test("classifyRows מסווג שורות תקינות, מדלג על סיכום ופוסל חוסרים", () => {
  const map = buildHeaderMap(HEADERS);
  const records = [
    rec({ product: "תירס גרוס", balance: 40 }),
    rec({ product: "כוספת סויה", balance: 12 }),
    rec({ client: "", product: "חיטה גרוסה" }), // חסר ארגון → נפסל
    { "ארגון": 'סה"כ כולל', "שם פריט": "" }, // שורת סיכום → מדולג
    {}, // ריקה → מדולג
  ];
  const res = classifyRows(records, map);
  assert.equal(res.valid.length, 2);
  assert.equal(res.rejected.length, 1);
  assert.deepEqual([...res.products].sort(), ["כוספת סויה", "תירס גרוס"]);
  assert.equal(res.clients.length, 1);
  // ערכים מומרים נכון
  assert.equal(res.valid[0].balance, 40);
  assert.equal(res.valid[0].product, "תירס גרוס");
});

test("toDateString מנרמל תאריכים וחודשי אספקה", () => {
  assert.equal(toDateString("03/07/25"), "2025-07-03");
  assert.equal(toDateString("03/07/2025"), "2025-07-03");
  assert.equal(toDateString("09/2025"), "2025-09-01"); // MM/YYYY → ה-1 בחודש
  assert.equal(toDateString(""), null);
  assert.equal(toDateString(null), null);
});

test("parseNumber מנקה פסיקים ומטבע", () => {
  assert.equal(parseNumber("1,234"), 1234);
  assert.equal(parseNumber("266"), 266);
  assert.equal(parseNumber(""), null);
  assert.equal(parseNumber("$1,000"), 1000);
});
