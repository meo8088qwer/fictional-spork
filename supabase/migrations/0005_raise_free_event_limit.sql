-- Product decision update: the free plan's 6 built-in events (30초/10초 x
-- 양발모아뛰기/번갈아뛰기/이중뛰기) are the full starter set, not a
-- 2-event teaser -- the paid plan's differentiator is adding events BEYOND
-- those 6, not unlocking the defaults themselves. Raises the event cap
-- enforced by 0002_plan_limit_triggers.sql's enforce_event_limit() from
-- 2 to 6 for free-plan gyms. Student cap (50 free / 200 paid) is unchanged.

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
    if v_count >= 6 then
      raise exception 'FREE_PLAN_EVENT_LIMIT_REACHED';
    end if;
  end if;

  return new;
end;
$$;
