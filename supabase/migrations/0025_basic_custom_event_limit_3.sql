-- BASIC's custom-event allowance drops from +5 to +3 (6 default + 3 custom
-- = 9 total instead of 11). See 0013_basic_pro_limits_v2.sql for the
-- original tier design this replaces the basic branch of.
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

  v_max := case v_plan when 'basic' then 9 else 6 end;

  select count(*) into v_count from public.events where gym_id = new.gym_id;
  if v_count >= v_max then
    raise exception 'FREE_PLAN_EVENT_LIMIT_REACHED';
  end if;

  return new;
end;
$$;
