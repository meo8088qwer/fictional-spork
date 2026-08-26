-- Toss Payments billing (빌링키 자동 정기결제) schema.
--
-- billing_key is the sensitive bit -- it's a long-lived token that can
-- charge the customer's card, so it must NEVER be readable by anon or
-- authenticated. Only service_role (used from Edge Functions, never the
-- browser) touches gym_subscriptions directly. The gym owner sees their
-- own status through the my_subscription view below, which simply omits
-- the billing_key column.

create table public.gym_subscriptions (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  -- Our own opaque customer identifier handed to Toss (not the gym's own
  -- id, so a leaked customerKey can't be correlated back to gym_id).
  customer_key uuid not null default gen_random_uuid() unique,
  billing_key text,
  card_last4 text,
  card_company text,
  -- The plan the owner is paying for vs. gyms.plan (actual entitlement) --
  -- kept separate so a failed renewal can downgrade gyms.plan while still
  -- remembering what they signed up for, for the retry/dunning flow.
  desired_plan text not null default 'basic' check (desired_plan in ('basic', 'pro')),
  status text not null default 'none' check (status in ('none', 'active', 'past_due', 'canceled')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  next_billing_date date,
  failed_attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gym_payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  -- Unique per billing cycle (e.g. `{gym_id}_{yyyymm}`) so a retried or
  -- duplicated scheduler run can never double-charge the same cycle.
  order_id text not null unique,
  plan text not null,
  billing_cycle text not null,
  amount int not null,
  status text not null check (status in ('paid', 'failed')),
  toss_payment_key text,
  failure_reason text,
  paid_at timestamptz not null default now()
);

create index idx_gym_payments_gym_id on public.gym_payments(gym_id);

alter table public.gym_subscriptions enable row level security;
alter table public.gym_payments enable row level security;

-- No policies at all for authenticated/anon on gym_subscriptions -- the
-- table is only ever touched by service_role (RLS doesn't apply to it),
-- which is exactly what we want since billing_key must stay server-only.

create policy gym_payments_owner_select on public.gym_payments
  for select to authenticated using (gym_id = public.auth_gym_id());

-- Safe subset of gym_subscriptions for the owner's own billing UI --
-- everything except billing_key.
create view public.my_subscription
with (security_invoker = true) as
select
  gym_id, customer_key, desired_plan, status, billing_cycle, next_billing_date,
  card_last4, card_company, failed_attempts
from public.gym_subscriptions
where gym_id = public.auth_gym_id();

grant select on public.my_subscription to authenticated;

-- The only sanctioned client-side write path onto gym_subscriptions. It can
-- only ever create a fresh 'none'-status placeholder row (to hand out a
-- customer_key for the card-registration widget) -- there is no way for a
-- caller to pass in status/billing_key/etc, so this can't be abused to
-- grant a paid plan without actually paying.
create or replace function public.ensure_gym_subscription()
returns public.my_subscription
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid := public.auth_gym_id();
begin
  if v_gym_id is null then
    raise exception 'No gym for current user';
  end if;

  insert into public.gym_subscriptions (gym_id)
  values (v_gym_id)
  on conflict (gym_id) do nothing;

  return (select * from public.my_subscription where gym_id = v_gym_id);
end;
$$;

grant execute on function public.ensure_gym_subscription() to authenticated;
