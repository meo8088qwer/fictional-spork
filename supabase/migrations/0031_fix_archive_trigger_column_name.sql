-- archive_student_records_anonymized() referenced jr.date, but jump_records'
-- actual column is record_date. This BEFORE DELETE trigger runs on every
-- student deletion, so the wrong column name meant every "학생 삭제" click
-- across every gym failed with "column jr.date does not exist" (Postgres
-- 42703) instead of deleting the student. Caught via a live Sentry
-- unhandled-rejection event from a real gym owner on /admin.
create or replace function public.archive_student_records_anonymized()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.anonymized_jump_stats (grade, gender, event_key, count, record_date)
  select old.grade, old.gender, jr.event_key, jr.count, jr.record_date
  from public.jump_records jr
  where jr.student_id = old.id;

  return old;
end;
$$;
