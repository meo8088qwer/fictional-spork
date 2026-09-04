-- Generalized version of grant_free_month() (0016) for the referrer-side
-- milestone rewards in verify-referral-otp: extends paid access by one
-- month same as grant_free_month, but accepts which plan to grant and
-- never downgrades a gym that's already on a higher plan (a BASIC-tier
-- milestone reward must not knock a PRO gym back down). grant_free_month
-- itself stays untouched -- it's still used as-is for the referred side's
-- flat welcome grant.
create or replace function public.grant_referral_reward_month(p_gym_id uuid, p_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_billing date;
  v_current_plan text;
  v_rank jsonb := '{"free": 0, "basic": 1, "pro": 2}'::jsonb;
begin
  if p_plan not in ('basic', 'pro') then
    raise exception 'INVALID_PLAN';
  end if;

  select next_billing_date into v_next_billing from public.gym_subscriptions where gym_id = p_gym_id;

  if not found then
    insert into public.gym_subscriptions (gym_id, desired_plan, status, billing_cycle, next_billing_date)
    values (p_gym_id, p_plan, 'active', 'monthly', (current_date + interval '1 month')::date);
  else
    update public.gym_subscriptions
    set status = 'active',
        next_billing_date = (greatest(coalesce(v_next_billing, current_date), current_date) + interval '1 month')::date,
        updated_at = now()
    where gym_id = p_gym_id;
  end if;

  select plan into v_current_plan from public.gyms where id = p_gym_id;
  if (v_rank->>v_current_plan)::int < (v_rank->>p_plan)::int then
    update public.gyms set plan = p_plan where id = p_gym_id;
  end if;
end;
$$;
