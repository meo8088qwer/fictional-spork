-- Guardrails for the public /preview demo account (roperank.com/preview),
-- which hands out one shared, real, logged-in session to anyone who has
-- the link -- built for AI/marketing tooling, but now also being shared
-- publicly for a vibe-coding contest, so casual visitors will click
-- everything including destructive/costly actions.
--
-- Demo account: auth.users.id = 0a8a2a19-07ca-49f9-8a32-86c80534bc03
-- Demo gym:     gyms.id       = 5156bc7a-8eb8-4dd3-bb5e-ace84c497071
--
-- Two things must be blocked outright (self-healing via reset can't fix
-- these -- a password change breaks the shared login for every future
-- visitor until someone manually fixes it in the DB again):
--   1. Real payments -- handled in supabase/functions/billing-issue
--      (rejects this gym_id before calling Toss).
--   2. Password changes on the demo auth user -- blocked below via a
--      trigger on auth.users, since supabase.auth.updateUser() goes
--      straight to GoTrue and never passes through a table this app
--      controls with RLS.
--
-- Everything else (add/delete students, records, events, gym name/logo,
-- subscription cancel) is left writable -- that's the point of a live
-- demo -- but reset back to its seeded snapshot on a schedule so any
-- mess (accidental or deliberate) only lasts a few hours.

create or replace function public.block_demo_password_change()
returns trigger
language plpgsql
as $$
begin
  if OLD.id = '0a8a2a19-07ca-49f9-8a32-86c80534bc03'
     and NEW.encrypted_password is distinct from OLD.encrypted_password then
    raise exception 'This is a shared public demo account -- password changes are disabled.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_block_demo_password_change on auth.users;
create trigger trg_block_demo_password_change
  before update on auth.users
  for each row
  execute function public.block_demo_password_change();

-- One-time snapshot of the demo gym's current (pristine, seeded) rows, as
-- plain jsonb -- reset just deletes-and-reinserts from this rather than
-- re-running the original growth-data generator.
create table if not exists public.demo_reset_snapshot (
  table_name text primary key,
  rows jsonb not null
);

insert into public.demo_reset_snapshot (table_name, rows)
values
  ('gyms', (select jsonb_agg(to_jsonb(g)) from public.gyms g where g.id = '5156bc7a-8eb8-4dd3-bb5e-ace84c497071')),
  ('events', (select jsonb_agg(to_jsonb(e)) from public.events e where e.gym_id = '5156bc7a-8eb8-4dd3-bb5e-ace84c497071')),
  ('students', (select jsonb_agg(to_jsonb(s)) from public.students s where s.gym_id = '5156bc7a-8eb8-4dd3-bb5e-ace84c497071')),
  ('jump_records', (select jsonb_agg(to_jsonb(r)) from public.jump_records r where r.gym_id = '5156bc7a-8eb8-4dd3-bb5e-ace84c497071'))
on conflict (table_name) do nothing;

-- Deletes jump_records explicitly BEFORE deleting the gym row, then lets
-- the gym delete cascade to events/students/gym_subscriptions/gym_payments
-- (all `gym_id references gyms(id) on delete cascade`). Two existing
-- triggers on this table set make that ordering matter, not just style:
--   - trg_prevent_default_event_deletion raises DEFAULT_EVENT_CANNOT_BE_DELETED
--     for a *standalone* delete of a non-custom event while its gym still
--     exists -- but explicitly allows it once the gym itself is gone, which
--     is exactly what a cascade from `delete from gyms` looks like. A direct
--     `delete from events where gym_id = ...` (gym still present) would hit
--     this and abort the whole reset.
--   - trg_archive_student_records_anonymized copies each deleted student's
--     jump_records into public.anonymized_jump_stats (identity stripped) --
--     harmless for one gym once, but this reset runs every 3 hours forever,
--     so leaving it hooked up would permanently pollute a real aggregate
--     stats table with fake demo data every cycle. Deleting jump_records
--     first means its student_id lookup finds nothing to archive.
create or replace function public.reset_demo_gym()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id constant uuid := '5156bc7a-8eb8-4dd3-bb5e-ace84c497071';
begin
  delete from public.jump_records where gym_id = v_gym_id;
  delete from public.gyms where id = v_gym_id;

  insert into public.gyms select * from jsonb_populate_recordset(
    null::public.gyms, (select rows from public.demo_reset_snapshot where table_name = 'gyms'));
  insert into public.events select * from jsonb_populate_recordset(
    null::public.events, (select rows from public.demo_reset_snapshot where table_name = 'events'));
  insert into public.students select * from jsonb_populate_recordset(
    null::public.students, (select rows from public.demo_reset_snapshot where table_name = 'students'));
  insert into public.jump_records select * from jsonb_populate_recordset(
    null::public.jump_records, (select rows from public.demo_reset_snapshot where table_name = 'jump_records'));
end;
$$;

create extension if not exists pg_cron;

select cron.schedule(
  'reset-demo-gym',
  '0 */3 * * *',
  $$select public.reset_demo_gym();$$
);
