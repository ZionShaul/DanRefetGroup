// ===== טיפוסים משותפים – משקי דן: ניהול רכש רפתות =====

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "blocked";
export type UploadStatus = "draft" | "published" | "historical";

export interface Organization {
  id: string;
  name: string;
  excel_client_name: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface Profile {
  id: string; // = auth.users.id
  full_name: string;
  phone: string;
  email: string;
  organization_id: string | null;
  role: UserRole;
  status: UserStatus;
  // הרשאות תצוגה (שמורות לתאימות מסך הניהול)
  show_purchases: boolean;
  show_my_purchases: boolean;
  // קשירת מכשיר יחיד (מניעת שיתוף התחברות)
  active_device_id: string | null;
  active_device_label: string | null;
  device_bound_at: string | null;
  created_at: string;
}

export interface ProfileWithOrg extends Profile {
  organization: Pick<Organization, "id" | "name"> | null;
}

export interface MonthlyUpload {
  id: string;
  file_name: string;
  title: string | null;
  storage_path: string | null;
  status: UploadStatus;
  uploaded_by: string | null;
  uploaded_at: string;
  published_at: string | null;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  organizations_count: number;
  products_count: number;
}

/** שורת הזמנה בודדת (תואם לעמודות קובץ הספקים המאוחד). */
export interface OrderLine {
  id: string;
  upload_id: string;
  organization_id: string | null;
  supplier: string | null; // ספק
  item_code: string | null; // פריט
  product: string; // שם פריט
  order_no: string | null; // הזמנה
  order_date: string | null; // תאריך הזמנה
  delivery_month: string | null; // חודש אספקה
  price: number | null; // מחיר
  tons_ordered: number | null; // טון מוזמן
  order_in_shipments: number | null; // הזמנה במשלוחים
  balance: number | null; // יתרה למשיכה
  qty_taken: number | null; // כמות שנלקחה
}

export interface RejectedRow {
  id: string;
  upload_id: string;
  reason: string;
  raw_data: Record<string, unknown>;
}

export interface SystemSettings {
  id: number;
  clicksense_url: string | null; // קישור "עידן חדש"
  clicksense_enabled: boolean;
  registration_url: string | null;
  registration_enabled: boolean;
  whatsapp_number: string | null;
  whatsapp_message: string | null;
  whatsapp_enabled: boolean;
  min_balance: number; // סף יתרה מינימלי לתצוגה (טון)
}

// ===== טיפוסים מחושבים לתצוגת הרפת =====

/** סיכום יתרה לחומר (כרטיס במסך הבית). */
export interface ProductBalance {
  product: string; // שם פריט
  balance: number; // סך יתרה למשיכה
  lineCount: number; // מספר שורות תורם
}
