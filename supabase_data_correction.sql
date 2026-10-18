-- Restore the assignment dates used by the initial PassHub data.
update public.license_assignments
set assigned_at = '2026-10-01T00:00:00+09:00'
where id = 1;

update public.license_assignments
set assigned_at = '2026-04-02T00:00:00+09:00'
where id = 2;

update public.license_assignments
set assigned_at = '2026-10-03T00:00:00+09:00'
where id = 3;

update public.license_assignments
set assigned_at = '2026-05-01T00:00:00+09:00'
where id = 4;
