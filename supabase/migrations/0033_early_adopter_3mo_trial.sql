-- Early-adopter event participation was low at the original terms, so the
-- gym owner is converting it to a flat "첫 100명 3개월 PRO 무료" offer:
--   - Every gym that has signed up so far gets 3 months of PRO starting
--     today, unconditionally (overwrites whatever trial/override state they
--     were in before).
--   - New signups keep getting the same 3-month PRO grant automatically,
--     but only while under 100 gyms have ever received it. Once the 100th
--     is granted, further signups fall back to plain FREE (no trial) --
--     this mirrors the "선착순 100명 한정" framing of the event.
-- Reuses the existing plan_override_expires_at + get_my_gym() lazy-revert
-- mechanism from 0022/0027 rather than adding new infrastructure. A
-- separate early_adopter_pro flag (not just "plan_override_expires_at is
-- not null") is needed for the 100-cap count because that column is also
-- used for one-off ops-dashboard grants unrelated to this event, and
-- because the flag must stay true forever as a permanent record even after
-- the 3 months lapse and plan reverts to free.

alter table public.gyms
  add column early_adopter_pro boolean not null default false;

update public.gyms
set plan = 'pro',
    plan_override_expires_at = now() + interval '3 months',
    early_adopter_pro = true,
    updated_at = now();

create or replace function public.create_gym_with_referral(p_name text, p_slug text, p_referral_code text default null)
returns public.gyms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_referrer_id uuid;
  v_result public.gyms;
  v_early_adopter_count int;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_referral_code is not null then
    select id into v_referrer_id from public.gyms
      where referral_code = p_referral_code and owner_id <> v_owner_id;
  end if;

  select count(*) into v_early_adopter_count from public.gyms where early_adopter_pro;

  if v_early_adopter_count < 100 then
    insert into public.gyms (
      owner_id, name, slug, referred_by_gym_id, plan, plan_override_expires_at, early_adopter_pro
    )
    values (v_owner_id, p_name, p_slug, v_referrer_id, 'pro', now() + interval '3 months', true)
    returning * into v_result;
  else
    insert into public.gyms (owner_id, name, slug, referred_by_gym_id)
    values (v_owner_id, p_name, p_slug, v_referrer_id)
    returning * into v_result;
  end if;

  insert into public.events (
    gym_id, key, time_seconds, title, short_title, technique,
    icon_name, badge_bg, badge_text, benchmark_good, benchmark_pro, description, is_custom
  )
  select v_result.id, d.key, d.time_seconds, d.title, d.short_title, d.technique,
         d.icon_name, d.badge_bg, d.badge_text, d.benchmark_good, d.benchmark_pro, d.description, false
  from public.default_event_definitions() d;

  return v_result;
end;
$$;

grant execute on function public.create_gym_with_referral(text, text, text) to authenticated;
