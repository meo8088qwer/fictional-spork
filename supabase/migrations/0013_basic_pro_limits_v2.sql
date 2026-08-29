-- Tier redesign: PRO becomes genuinely unlimited (students + events), and
-- BASIC gets its own event cap (6 default + 5 custom = 11) instead of being
-- unlimited like PRO -- previously BASIC and PRO had identical event limits
-- (both unlimited), which left no event-count reason to upgrade past BASIC.
--   free:  50 students,  6 events (defaults only, no custom)
--   basic: 150 students, 11 events (defaults + up to 5 custom)
--   pro:   unlimited students, unlimited events

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
  if v_plan = 'pro' then
    return new;
  end if;

  v_max := case v_plan when 'basic' then 150 else 50 end;

  select count(*) into v_count from public.students where gym_id = new.gym_id;
  if v_count >= v_max then
    raise exception 'STUDENT_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_event_limit()
returns trigger
language plpgsql
as $$
declare
  v_plan text;
  v_count int;
  v_max int;
begin
  select plan into v_plan from public.gyms where id = new.gym_id;
  if v_plan = 'pro' then
    return new;
  end if;

  v_max := case v_plan when 'basic' then 11 else 6 end;

  select count(*) into v_count from public.events where gym_id = new.gym_id;
  if v_count >= v_max then
    raise exception 'FREE_PLAN_EVENT_LIMIT_REACHED';
  end if;

  return new;
end;
$$;
