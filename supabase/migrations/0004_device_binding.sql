-- ============================================================
-- קשירת חשבון למכשיר יחיד (מניעת שיתוף התחברות).
-- "מכשיר ראשון מנצח": החשבון נקשר למכשיר הראשון; אחרים נחסמים עד איפוס מנהל.
-- חל על משתמשי רפת בלבד (מנהלים פטורים – נאכף בקוד).
-- מיגרציה אדיטיבית (ניתן להריץ על DB קיים).
-- ============================================================

alter table profiles add column if not exists active_device_id text;
alter table profiles add column if not exists active_device_label text;
alter table profiles add column if not exists device_bound_at timestamptz;
