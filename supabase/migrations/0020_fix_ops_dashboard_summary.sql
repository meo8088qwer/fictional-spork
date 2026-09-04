-- ops_dashboard_summary's failed_payments subquery had a stray query-level
-- `order by p.paid_at desc limit 50` sitting alongside a single-row
-- aggregate (jsonb_agg) -- Postgres rejects ordering a non-aggregate
-- column in a query whose SELECT list is otherwise just an aggregate
-- (42803). This made the whole RPC fail on every call, which is why the
-- ops dashboard's overview page could never load past "불러오지 못했어요"
-- for a real (non-network) reason. Fix: order/limit inside a subquery
-- before aggregating, same pattern already used correctly elsewhere in
-- this function (e.g. inactive_gyms).
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
        'gym_id', fp.gym_id,
        'gym_name', fp.name,
        'plan', fp.plan,
        'amount', fp.amount,
        'failure_reason', fp.failure_reason,
        'paid_at', fp.paid_at
      ) order by fp.paid_at desc), '[]'::jsonb)
      from (
        select p.gym_id, g.name, p.plan, p.amount, p.failure_reason, p.paid_at
        from public.gym_payments p
        join public.gyms g on g.id = p.gym_id
        where p.status = 'failed'
        order by p.paid_at desc
        limit 50
      ) fp
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
