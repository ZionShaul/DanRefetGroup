-- ============================================================
-- משקי דן – ניהול רכש רפתות : סכמה, RLS ו-RPC
-- כל רפת (ארגון) רואה רק את שורות ההזמנות שלה מהטעינה הפעילה.
-- ============================================================

-- ---------- טבלאות ----------

-- ארגונים = רפתות. excel_client_name = הערך בעמודת "ארגון" בקובץ האקסל.
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  excel_client_name text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);
create unique index if not exists organizations_excel_client_key
  on organizations (lower(excel_client_name));

-- פרופילי משתמשים. כמה משתמשים יכולים להיות מקושרים לאותה רפת.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null default '',
  email text not null,
  organization_id uuid references organizations(id) on delete set null,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'active' check (status in ('active','blocked')),
  -- שמור לתאימות עם מסך ניהול המשתמשים (אינו בשימוש בתצוגת הרפת בשלב זה)
  show_purchases boolean not null default true,
  show_my_purchases boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists profiles_org_idx on profiles(organization_id);

-- טעינות חודשיות. מצב 'replace each upload': בעת פרסום נמחקות הטעינות הקודמות.
create table if not exists monthly_uploads (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  title text,
  storage_path text,
  status text not null default 'draft' check (status in ('draft','published','historical')),
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  published_at timestamptz,
  total_rows int not null default 0,
  valid_rows int not null default 0,
  rejected_rows int not null default 0,
  organizations_count int not null default 0,
  products_count int not null default 0
);
-- לכל היותר טעינה אחת מפורסמת בכל רגע
create unique index if not exists monthly_uploads_one_published
  on monthly_uploads (status) where status = 'published';

-- שורות הזמנה – לב המערכת. עמודות תואמות לקובץ הספקים המאוחד.
create table if not exists order_lines (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references monthly_uploads(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  supplier text,             -- ספק
  item_code text,            -- פריט (מק"ט)
  product text not null,     -- שם פריט (החומר)
  order_no text,             -- הזמנה
  order_date date,           -- תאריך הזמנה
  delivery_month date,       -- חודש אספקה
  price numeric,             -- מחיר
  tons_ordered numeric,      -- טון מוזמן
  order_in_shipments numeric,-- הזמנה במשלוחים
  balance numeric,           -- יתרה למשיכה
  qty_taken numeric          -- כמות שנלקחה
);
create index if not exists order_lines_upload_idx on order_lines(upload_id);
create index if not exists order_lines_org_idx on order_lines(organization_id);
create index if not exists order_lines_org_product_idx on order_lines(organization_id, product);

-- שורות שהוחרגו בפרסור (לוג למנהל)
create table if not exists rejected_rows (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references monthly_uploads(id) on delete cascade,
  reason text not null,
  raw_data jsonb not null default '{}'::jsonb
);
create index if not exists rejected_rows_upload_idx on rejected_rows(upload_id);

-- ---------- פונקציות עזר ----------

create or replace function active_upload_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from monthly_uploads where status = 'published' limit 1;
$$;

create or replace function current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- ---------- RLS ----------

alter table organizations   enable row level security;
alter table profiles        enable row level security;
alter table monthly_uploads enable row level security;
alter table order_lines     enable row level security;
alter table rejected_rows   enable row level security;

-- profiles: המשתמש רואה את עצמו; מנהל רואה הכל. כתיבה דרך service role.
create policy profiles_select_self on profiles for select
  using (id = auth.uid() or is_admin());

-- organizations: כל משתמש מאומת רשאי לקרוא (להצגת שם הרפת). כתיבה – service role.
create policy organizations_select on organizations for select
  using (auth.uid() is not null);

-- monthly_uploads / rejected_rows: מנהל בלבד.
create policy uploads_admin  on monthly_uploads for select using (is_admin());
create policy rejected_admin on rejected_rows  for select using (is_admin());

-- order_lines: לב הבידוד – משתמש רואה רק את שורות הרפת שלו מהטעינה הפעילה.
create policy order_lines_select on order_lines for select using (
  is_admin()
  or (organization_id = current_org_id() and upload_id = active_upload_id())
);

-- ---------- RPC: פרסום טעינה (החלפה מלאה) ----------
-- מצב "החלפה בכל טעינה": פרסום מוחק את כל הטעינות האחרות (cascade על order_lines).

create or replace function publish_upload(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;
  delete from monthly_uploads where id <> p_id;
  update monthly_uploads
    set status = 'published', published_at = now()
    where id = p_id;
end;
$$;

-- ---------- RPC: פרטי הטעינה הפעילה (לבאנר) ----------
-- security definer => נגיש למשתמש רגיל למרות ש-RLS על monthly_uploads מוגבל למנהל.

create or replace function get_active_upload()
returns table (id uuid, title text, file_name text, published_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, title, file_name, published_at
  from monthly_uploads
  where status = 'published'
  limit 1;
$$;

grant execute on function active_upload_id()  to authenticated;
grant execute on function publish_upload(uuid) to authenticated;
grant execute on function get_active_upload()  to authenticated;

-- ---------- Storage bucket לקבצי אקסל ----------
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;
