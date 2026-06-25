-- ============================================================
-- סטטיסטיקת רפתות לניהול: מספר משתמשים, שורות הזמנה, והזמנות פתוחות (לאזהרת מחיקה).
-- מיגרציה אדיטיבית.
-- ============================================================

create or replace function get_org_stats()
returns table (
  id uuid,
  name text,
  excel_client_name text,
  users_count bigint,
  order_count bigint,
  open_count bigint
)
language sql stable security definer set search_path = public as $$
  select
    o.id,
    o.name,
    o.excel_client_name,
    (select count(*) from profiles p where p.organization_id = o.id) as users_count,
    (select count(*) from order_lines ol where ol.organization_id = o.id) as order_count,
    (select count(*) from order_lines ol
       where ol.organization_id = o.id
         and ol.upload_id = active_upload_id()
         and coalesce(ol.balance, 0) > 0) as open_count
  from organizations o
  where is_admin()
  order by o.name;
$$;

grant execute on function get_org_stats() to authenticated;
