-- ============================================================
-- הגדרות מערכת: קישור עידן חדש, בקשת רישום, וואטסאפ
-- מיגרציה אדיטיבית (ניתן להריץ על DB קיים).
-- ============================================================

create table if not exists system_settings (
  id int primary key default 1 check (id = 1),
  clicksense_url text,              -- קישור "עידן חדש" (נתונים היסטוריים וניתוח)
  clicksense_enabled boolean not null default false,
  registration_url text,            -- קישור "בקשה לרישום משתמש"
  registration_enabled boolean not null default false,
  whatsapp_number text,             -- מספר וואטסאפ בפורמט בינלאומי (ספרות בלבד)
  whatsapp_message text,            -- הודעת ברירת מחדל
  whatsapp_enabled boolean not null default false
);
insert into system_settings (id) values (1) on conflict do nothing;

-- עמודות נוספות (אם הטבלה כבר קיימת מגרסה מוקדמת)
alter table system_settings add column if not exists registration_url text;
alter table system_settings add column if not exists registration_enabled boolean not null default false;
alter table system_settings add column if not exists whatsapp_number text;
alter table system_settings add column if not exists whatsapp_message text;
alter table system_settings add column if not exists whatsapp_enabled boolean not null default false;

alter table system_settings enable row level security;

-- קריאה לכל משתמש מאומת; כתיבה – service role בלבד.
drop policy if exists settings_select on system_settings;
create policy settings_select on system_settings for select
  using (auth.uid() is not null);

-- ---------- RPC: קישור הרישום (נגיש גם למסך ההתחברות, ללא התחברות) ----------
create or replace function get_registration_link()
returns table (url text, enabled boolean)
language sql stable security definer set search_path = public as $$
  select registration_url, registration_enabled from system_settings where id = 1;
$$;

grant execute on function get_registration_link() to anon, authenticated;
