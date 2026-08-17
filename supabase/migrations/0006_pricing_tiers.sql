-- Replaces the old binary free/paid plan with the real pricing tiers:
--   free:  50 students,  6 events (the default set, no custom events)
--   basic: 150 students, unlimited events
--   pro:   500 students, unlimited events (not sold yet, but the DB accepts
--          the value now so no migration is needed when it launches)
-- Any existing 'paid' gyms become 'basic' -- that was the only paid tier
-- that ever existed, so this is a straight rename, not a real migration.

alter table public.gyms drop constraint if exists gyms_plan_check;
update public.gyms set plan = 'basic' where plan = 'paid';
alter table public.gyms add constraint gyms_plan_check check (plan in ('free', 'basic', 'pro'));

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
  v_max := case v_plan
    when 'pro' then 500
    when 'basic' then 150
    else 50
  end;

  select count(*) into v_count from public.students where gym_id = new.gym_id;
  if v_count >= v_max then
    raise exception 'STUDENT_LIMIT_REACHED';
  end if;

  return new;
end;
$$;
