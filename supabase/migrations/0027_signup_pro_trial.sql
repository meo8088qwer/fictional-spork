-- New signups start on a 14-day PRO trial instead of FREE. Reuses the
-- existing lazy-expiry mechanism from 0022 (plan_override_expires_at +
-- get_my_gym()'s auto-revert-to-free-when-passed check) rather than adding
-- new infrastructure -- this is exactly the same mechanism the ops
-- dashboard uses for a manual "1개월 프로 이벤트" grant, just applied
-- automatically at gym creation. No cron/scheduled job needed: the revert
-- happens the next time the gym owner's session loads their gym.
--
-- Renaming a parameter would hit the "cannot change name of input
-- parameter" restriction from 0023's create_gym_with_referral change, but
-- this edit only touches the function body, so a plain create or replace
-- is safe here.
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
    -- Excludes a gym referring itself (same owner signing up a second
    -- gym account with their own referral link) -- unknown/self codes are
    -- silently ignored rather than failing signup over it.
    select id into v_referrer_id from public.gyms
      where referral_code = p_referral_code and owner_id <> v_owner_id;
  end if;

  insert into public.gyms (owner_id, name, slug, referred_by_gym_id, plan, plan_override_expires_at)
  values (v_owner_id, p_name, p_slug, v_referrer_id, 'pro', now() + interval '14 days')
  returning * into v_result;

  return v_result;
end;
$$;
