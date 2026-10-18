-- Extra fields used by the current PassHub screens.
-- Run after supabase_schema.sql.

alter table public.license_plans
  add column if not exists notice_days integer,
  add column if not exists cost_center text,
  add column if not exists owner text,
  add column if not exists vendor text,
  add column if not exists vendor_contact text,
  add column if not exists document_url text;

alter table public.members
  add column if not exists position text,
  add column if not exists manager_id bigint references public.members(id) on delete set null,
  add column if not exists employment_type text,
  add column if not exists hire_date date,
  add column if not exists contract_end_date date,
  add column if not exists leave_date date;

alter table public.license_assignments
  add column if not exists requested_by text,
  add column if not exists reason text,
  add column if not exists last_used_at date;

update public.license_plans
set notice_days = 30,
    cost_center = '情報システム部',
    owner = '田中 太郎',
    vendor = 'サンプル販売株式会社',
    vendor_contact = '営業部 佐々木 / sasaki@example.com / 03-0000-0000',
    document_url = 'https://example.com/contracts/ms365'
where id = 1;

update public.license_plans
set notice_days = 14,
    cost_center = 'デザイン部',
    owner = '佐藤 花子',
    vendor = 'Adobe（直接契約）'
where id = 2;

update public.license_plans
set cost_center = '総務部',
    owner = '鈴木 一郎'
where id = 3;

update public.members
set position = '課長', employment_type = 'regular', hire_date = '2015-04-01'
where id = 1;

update public.members
set position = '主任', manager_id = 1, employment_type = 'regular', hire_date = '2019-04-01'
where id = 2;

update public.members
set manager_id = 1, employment_type = 'regular', hire_date = '2022-10-01',
    leave_date = '2026-11-10'
where id = 3;

update public.members
set manager_id = 2, employment_type = 'dispatch', hire_date = '2026-05-01',
    contract_end_date = '2026-10-31'
where id = 4;

update public.license_assignments
set requested_by = '情報システム部長', reason = '業務で使用', last_used_at = '2026-10-16'
where id = 1;

update public.license_assignments
set requested_by = '企画部長', reason = '資料作成', last_used_at = '2026-06-20'
where id = 2;

update public.license_assignments
set requested_by = '', reason = ''
where id = 3;

update public.license_assignments
set requested_by = '企画部 佐藤', reason = '派遣スタッフの業務連絡',
    last_used_at = '2026-10-16'
where id = 4;
