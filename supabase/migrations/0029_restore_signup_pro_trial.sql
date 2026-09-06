-- Regression fix: 0028's rewrite of create_gym_with_referral() (to fold in
-- atomic event-seeding) was based on the pre-0027 version of this function
-- and silently dropped the plan/plan_override_expires_at columns from the
-- gyms insert, reverting every new signup back to a plain FREE gym instead
-- of the 14-day PRO trial from 0027. Caught when a real Instagram signup
-- ("신봉파워점핑&FLY HIGH") came in as FREE and had to be corrected by hand.
-- Restores the 0027 behavior on top of 0028's atomic event-seeding.
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
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_referral_code is not null then
    select id into v_referrer_id from public.gyms
      where referral_code = p_referral_code and owner_id <> v_owner_id;
  end if;

  insert into public.gyms (owner_id, name, slug, referred_by_gym_id, plan, plan_override_expires_at)
  values (v_owner_id, p_name, p_slug, v_referrer_id, 'pro', now() + interval '14 days')
  returning * into v_result;

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
