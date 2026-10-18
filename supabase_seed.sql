-- Optional demo data for the Supabase database.
-- Run after supabase_schema.sql. This script is safe to run once on an empty project.

insert into public.tools
  (id, name, provider_name, category, description, admin_url, official_url, status, notes)
values
  (1, 'Microsoft 365', 'Microsoft', '業務ツール', 'メール・Office・Teams',
   'https://admin.microsoft.com/', 'https://www.microsoft.com/ja-jp/microsoft-365', 'active', ''),
  (2, 'Adobe Creative Cloud', 'Adobe', 'デザイン', 'デザイン部と広報が使用',
   'https://adminconsole.adobe.com/', 'https://www.adobe.com/jp/creativecloud.html', 'active', ''),
  (3, 'Slack', 'Salesforce', 'コミュニケーション', '社内チャット',
   'https://app.slack.com/', 'https://slack.com/intl/ja-jp/', 'active', '');

insert into public.license_plans
  (id, tool_id, plan_name, total_quantity, start_date, end_date, renewal_date,
   auto_renew, billing_type, price, status, contract_number, notes)
values
  (1, 1, 'Microsoft 365 Business Standard', 100, '2025-12-01', '2026-11-30', '2026-11-30',
   true, 'yearly', 1874400, 'active', 'MS-2025-0412',
   'ライセンスキーはパスワード管理ツールの「M365」フォルダ'),
  (2, 2, 'Creative Cloud Pro', 20, '2025-12-16', '2026-12-15', '2026-12-15',
   true, 'monthly', 168000, 'active', 'AD-88213', ''),
  (3, 3, 'Slack Pro', 50, '2026-04-01', '2027-03-31', '2027-03-31',
   false, 'yearly', 555000, 'active', '', '');

insert into public.members
  (id, name, email, member_number, department, status, notes)
values
  (1, '田中 太郎', 't.tanaka@example.jp', 'E001', '情報システム部', 'active', '課長'),
  (2, '佐藤 花子', 'h.sato@example.jp', 'E002', '企画部', 'active', '主任'),
  (3, '鈴木 一郎', 'i.suzuki@example.jp', 'E003', '営業部', 'active', '11月に大阪支社へ異動'),
  (4, '高橋 美咲', 'm.takahashi@example.jp', 'C010', '企画部', 'active', '派遣元: サンプル人材株式会社');

insert into public.license_assignments
  (id, license_plan_id, member_id, assigned_at, status, notes)
values
  (1, 1, 1, '2026-10-01T00:00:00+09:00', 'assigned', '情報システム部長 / 業務で使用'),
  (2, 2, 2, '2026-04-02T00:00:00+09:00', 'assigned', '企画部長 / 資料作成'),
  (3, 1, 3, '2026-10-03T00:00:00+09:00', 'assigned', ''),
  (4, 3, 4, '2026-05-01T00:00:00+09:00', 'assigned', '企画部 佐藤 / 派遣スタッフの業務連絡');

insert into public.operation_logs
  (id, action_type, target_type, target_id, created_at)
values
  (1, '初期データを読み込み', 'システム', null, '2026-10-11T15:00:00+09:00');

select setval(pg_get_serial_sequence('public.tools', 'id'), coalesce((select max(id) from public.tools), 1));
select setval(pg_get_serial_sequence('public.license_plans', 'id'), coalesce((select max(id) from public.license_plans), 1));
select setval(pg_get_serial_sequence('public.members', 'id'), coalesce((select max(id) from public.members), 1));
select setval(pg_get_serial_sequence('public.license_assignments', 'id'), coalesce((select max(id) from public.license_assignments), 1));
select setval(pg_get_serial_sequence('public.operation_logs', 'id'), coalesce((select max(id) from public.operation_logs), 1));
