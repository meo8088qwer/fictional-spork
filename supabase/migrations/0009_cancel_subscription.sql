-- Lets a gym owner self-cancel their subscription. Narrow SECURITY DEFINER
-- RPC (same pattern as ensure_gym_subscription) so this is the only write
-- path an authenticated user has into gym_subscriptions -- and it can only
-- ever downgrade the caller's own gym, never grant paid status.
--
-- Interim billing (one-time payments, no stored billing_key) has no
-- recurring charge to stop, so "cancel" just means: drop back to free now
-- instead of waiting for next_billing_date to lapse. Once real
-- billing-key auto-renewal is wired back in, this should also revoke/void
-- the billing_key with Toss.
create or replace function public.cancel_gym_subscription()
returns public.my_subscription
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid := public.auth_gym_id();
  v_result public.my_subscription;
begin
  if v_gym_id is null then
    raise exception 'No gym for current user';
  end if;

  update public.gym_subscriptions
  set status = 'canceled',
      updated_at = now()
  where gym_id = v_gym_id;

  update public.gyms
  set plan = 'free'
  where id = v_gym_id;

  select * into v_result from public.my_subscription where gym_id = v_gym_id;
  return v_result;
end;
$$;

grant execute on function public.cancel_gym_subscription() to authenticated;
