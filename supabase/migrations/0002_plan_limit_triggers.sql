-- Plan-limit enforcement lives in the database, not just the client.
-- The client (AdminBatchEntry.tsx) also checks these limits for instant
-- UX, but that check is bypassable by anyone calling the Supabase REST
-- API directly with their own anon-key session -- these triggers are the
-- real gate. Limits per the product's marketing copy:
--   free: max 2 event types, max 50 students
--   paid: unlimited event types, max 200 students

create or replace function public.enforce_event_limit()
returns trigger
language plpgsql
as $$
declare
  v_plan text;
  v_count int;
begin
  select plan into v_plan from public.gyms where id = new.gym_id;

  if v_plan = 'free' then
    select count(*) into v_count from public.events where gym_id = new.gym_id;
    if v_count >= 2 then
      raise exception 'FREE_PLAN_EVENT_LIMIT_REACHED';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_event_limit
before insert on public.events
for each row execute function public.enforce_event_limit();

create or replace function public.enforce_student_limit()
returns trigger
language plpgsql
as $$
declare
  v_plan text;
  v_count int;
  v_max int;
begin
  select plan into v_plan from public.gyms where id = new.gym_id;
  v_max := case when v_plan = 'paid' then 200 else 50 end;

  select count(*) into v_count from public.students where gym_id = new.gym_id;
  if v_count >= v_max then
    raise exception 'STUDENT_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_student_limit
before insert on public.students
for each row execute function public.enforce_student_limit();

-- jump_records.gym_id is always derived from student_id server-side, never
-- accepted from the client -- this is what makes the RLS insert policy in
-- 0003 (`gym_id = auth_gym_id()`) actually safe: a client cannot forge a
-- record into a different gym's tenant by passing a different gym_id.
create or replace function public.set_jump_record_gym_id()
returns trigger
language plpgsql
as $$
begin
  select gym_id into new.gym_id from public.students where id = new.student_id;
  if new.gym_id is null then
    raise exception 'INVALID_STUDENT_ID';
  end if;
  return new;
end;
$$;

create trigger trg_set_jump_record_gym_id
before insert or update of student_id on public.jump_records
for each row execute function public.set_jump_record_gym_id();
