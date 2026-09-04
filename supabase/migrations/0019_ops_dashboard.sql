-- Platform-operator dashboard: cross-gym visibility (signups, revenue,
-- churn, referral, plan overrides) for the ROPERANK operator only -- never
-- a gym owner. Every read/write here goes through a SECURITY DEFINER
-- function that checks is_platform_admin() first, so even a client that
-- calls these RPCs directly (bypassing the UI) is refused unless their
-- auth.uid() is in platform_admins. Normal per-gym RLS is untouched; these
-- functions intentionally bypass it (that's the whole point) but only for
-- the allowlisted operator.

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
-- Deliberately no policies at all -- nobody can read/write this table via
-- PostgREST, not even a listed admin. It's only ever read from inside the
-- SECURITY DEFINER functions below, which run with elevated privilege and
-- bypass RLS internally.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- Seed: the operator's own account. Add more later with
-- `insert into public.platform_admins (user_id) values ('<uuid>')`.
insert into public.platform_admins (user_id)
values ('a83d8e29-269e-415d-9151-aabb15f6cab1')
on conflict do nothing;

-- One consolidated call for the dashboard's overview page -- signup trend,
-- activation, revenue/MRR, plan mix, referral totals. Kept as a single
-- RPC (rather than one per widget) so the page has one loading state and
-- one round trip.
create or replace function public.ops_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'signups_daily', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as d, count(*) as c
        from public.gyms
        where created_at >= now() - interval '90 days'
        group by 1
      ) t
    ),
    'total_gyms', (select count(*) from public.gyms),
    'zero_student_gyms', (
      select count(*) from public.gyms g
      where not exists (select 1 from public.students s where s.gym_id = g.id)
    ),
    'zero_record_gyms', (
      select count(*) from public.gyms g
      where not exists (select 1 from public.jump_records r where r.gym_id = g.id)
    ),
    -- Signed up 3+ days ago but nothing recorded in the last 14 days
    -- (covers "never started" and "started, then went quiet" alike) --
    -- direct outreach candidates.
    'inactive_gyms', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'slug', g.slug,
        'plan', g.plan,
        'created_at', g.created_at,
        'student_count', (select count(*) from public.students s where s.gym_id = g.id),
        'last_record_date', (select max(r.record_date) from public.jump_records r where r.gym_id = g.id)
      ) order by g.created_at desc), '[]'::jsonb)
      from public.gyms g
      where g.created_at <= now() - interval '3 days'
        and not exists (
          select 1 from public.jump_records r
          where r.gym_id = g.id and r.record_date >= (now() - interval '14 days')::date
        )
      limit 100
    ),
    'plan_distribution', (
      select coalesce(jsonb_object_agg(plan, cnt), '{}'::jsonb)
      from (select plan, count(*) as cnt from public.gyms group by plan) t
    ),
    'revenue_this_month', (
      select coalesce(sum(amount), 0) from public.gym_payments
      where status = 'paid' and paid_at >= date_trunc('month', now())
    ),
    -- Monthly-equivalent revenue from every currently-active subscription.
    -- Prices mirror src/data/pricing.ts (basic 4900/mo, pro 9900/mo,
    -- yearly = 10x monthly paid once/yr) -- keep both in sync if pricing
    -- changes, same duplication tradeoff as the billing Edge Functions.
    'mrr_estimate', (
      select coalesce(sum(
        case
          when sub.desired_plan = 'basic' and sub.billing_cycle = 'yearly' then 4900 * 10.0 / 12
          when sub.desired_plan = 'basic' then 4900
          when sub.desired_plan = 'pro' and sub.billing_cycle = 'yearly' then 9900 * 10.0 / 12
          when sub.desired_plan = 'pro' then 9900
          else 0
        end
      ), 0)
      from public.gym_subscriptions sub
      where sub.status = 'active'
    ),
    'basic_conversions', (select count(distinct gym_id) from public.gym_payments where status = 'paid' and plan = 'basic'),
    'pro_conversions', (select count(distinct gym_id) from public.gym_payments where status = 'paid' and plan = 'pro'),
    'failed_payments', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'gym_id', p.gym_id,
        'gym_name', g.name,
        'plan', p.plan,
        'amount', p.amount,
        'failure_reason', p.failure_reason,
        'paid_at', p.paid_at
      ) order by p.paid_at desc), '[]'::jsonb)
      from public.gym_payments p
      join public.gyms g on g.id = p.gym_id
      where p.status = 'failed'
      order by p.paid_at desc
      limit 50
    ),
    'active_subscriptions', (select count(*) from public.gym_subscriptions where status = 'active'),
    'canceled_subscriptions', (select count(*) from public.gym_subscriptions where status = 'canceled'),
    'referral_total', (select count(*) from public.gyms where referred_by_gym_id is not null),
    'referral_rewarded', (select count(*) from public.gyms where referral_reward_granted_at is not null)
  ) into result;

  return result;
end;
$$;

grant execute on function public.ops_dashboard_summary() to authenticated;

-- Searchable/paginated gym directory for the "체육관 목록" table.
create or replace function public.ops_list_gyms(p_search text default null, p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  v_total int;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select count(*) into v_total
  from public.gyms g
  where p_search is null or p_search = ''
     or g.name ilike '%' || p_search || '%'
     or g.slug ilike '%' || p_search || '%';

  select jsonb_build_object(
    'total', v_total,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'slug', g.slug,
        'plan', g.plan,
        'created_at', g.created_at,
        'student_count', (select count(*) from public.students s where s.gym_id = g.id),
        'record_count', (select count(*) from public.jump_records r where r.gym_id = g.id),
        'last_record_date', (select max(r.record_date) from public.jump_records r where r.gym_id = g.id)
      ) order by g.created_at desc)
      from (
        select * from public.gyms g
        where p_search is null or p_search = ''
           or g.name ilike '%' || p_search || '%'
           or g.slug ilike '%' || p_search || '%'
        order by g.created_at desc
        limit p_limit offset p_offset
      ) g
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.ops_list_gyms(text, int, int) to authenticated;

-- One gym's full detail (profile + payment history) for the drill-down view.
create or replace function public.ops_gym_detail(p_gym_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'gym', (
      select jsonb_build_object(
        'id', g.id, 'name', g.name, 'slug', g.slug, 'plan', g.plan, 'created_at', g.created_at,
        'student_count', (select count(*) from public.students s where s.gym_id = g.id),
        'record_count', (select count(*) from public.jump_records r where r.gym_id = g.id),
        'last_record_date', (select max(r.record_date) from public.jump_records r where r.gym_id = g.id),
        'referred_by_gym_id', g.referred_by_gym_id
      )
      from public.gyms g where g.id = p_gym_id
    ),
    'subscription', (
      select jsonb_build_object(
        'status', sub.status, 'desired_plan', sub.desired_plan, 'billing_cycle', sub.billing_cycle,
        'next_billing_date', sub.next_billing_date, 'card_last4', sub.card_last4, 'card_company', sub.card_company
      )
      from public.gym_subscriptions sub where sub.gym_id = p_gym_id
    ),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'plan', p.plan, 'billing_cycle', p.billing_cycle, 'amount', p.amount,
        'status', p.status, 'failure_reason', p.failure_reason, 'paid_at', p.paid_at
      ) order by p.paid_at desc)
      from public.gym_payments p where p.gym_id = p_gym_id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.ops_gym_detail(uuid) to authenticated;

-- Manual plan override -- only ever touches gyms.plan, never
-- gym_subscriptions, so it can't be silently reverted or fought over by
-- the automatic renewal cron (billing-charge only ever looks at
-- subscriptions with status = 'active').
create or replace function public.ops_update_gym_plan(p_gym_id uuid, p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.gyms;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_plan not in ('free', 'basic', 'pro') then
    raise exception 'INVALID_PLAN';
  end if;

  update public.gyms set plan = p_plan, updated_at = now()
  where id = p_gym_id
  returning * into v_result;

  if v_result.id is null then
    raise exception 'GYM_NOT_FOUND';
  end if;

  return jsonb_build_object('id', v_result.id, 'name', v_result.name, 'plan', v_result.plan);
end;
$$;

grant execute on function public.ops_update_gym_plan(uuid, text) to authenticated;
