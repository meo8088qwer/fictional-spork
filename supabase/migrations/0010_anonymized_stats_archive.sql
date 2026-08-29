-- Product/legal decision: when a student is deleted, their identifiable
-- data (name, student number, notes) must be erased -- but the jump-rope
-- measurements themselves have standalone statistical value the business
-- wants to keep using indefinitely (benchmark data, future features).
--
-- The standard way to reconcile "delete personal data on request" with
-- "keep the data forever" is irreversible anonymization: strip every
-- identifying field (no student_id, no gym_id, no name) before archiving,
-- so what's left is no longer "personal information" under Korean law and
-- carries no retention-period obligation. This table intentionally has no
-- foreign keys back to students/gyms -- that link is exactly what must not
-- survive.
create table public.anonymized_jump_stats (
  id uuid primary key default gen_random_uuid(),
  grade text,
  gender text,
  event_key text,
  count int not null,
  record_date date not null,
  archived_at timestamptz not null default now()
);

-- No RLS policies granted to anon/authenticated -- this table is for the
-- operator's own internal analytics, not a per-tenant read path. Only
-- service_role (dashboard SQL editor, or a future analytics Edge Function)
-- can read it.
alter table public.anonymized_jump_stats enable row level security;

-- Runs BEFORE the student row (and its cascading jump_records) are
-- deleted, so the records are still there to copy at that point.
create or replace function public.archive_student_records_anonymized()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.anonymized_jump_stats (grade, gender, event_key, count, record_date)
  select old.grade, old.gender, jr.event_key, jr.count, jr.date
  from public.jump_records jr
  where jr.student_id = old.id;

  return old;
end;
$$;

create trigger trg_archive_student_records_anonymized
before delete on public.students
for each row execute function public.archive_student_records_anonymized();
