-- Lets the ops dashboard grant a time-limited plan (e.g. "1개월 프로
-- 체험" for an Instagram event) that reverts on its own once it expires.
-- There's no cron/scheduled-job infrastructure in this project yet
-- (pg_cron isn't enabled), so instead of a background job, the expiry is
-- checked lazily: every time a gym's own data is loaded (every admin
-- login/refresh, via the new get_my_gym() RPC below), if the override has
-- passed we revert to free right then. This needs no new infrastructure
-- and reverts before the gym owner ever sees the stale paid plan.

alter table public.gyms add column if not exists plan_override_expires_at timestamptz;

create or replace function public.get_my_gym()
returns public.gyms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym public.gyms;
begin
  select * into v_gym from public.gyms where owner_id = auth.uid();
  if v_gym.id is null then
    return null;
  end if;

  if v_gym.plan_override_expires_at is not null and v_gym.plan_override_expires_at < now() then
    update public.gyms
    set plan = 'free', plan_override_expires_at = null, updated_at = now()
    where id = v_gym.id
    returning * into v_gym;
  end if;

  return v_gym;
end;
$$;

grant execute on function public.get_my_gym() to authenticated;

-- ops_update_gym_plan gains an optional duration -- null/omitted means a
-- permanent override (unchanged behavior), a positive integer means
-- "revert to free after this many months." Only meaningful for
-- basic/pro; a free grant never carries an expiry.
--
-- Adding the parameter changes the function's signature, so `create or
-- replace` alone would leave the old 2-arg version sitting alongside this
-- one as a separate overload -- drop it first so only one exists.
drop function if exists public.ops_update_gym_plan(uuid, text);

create or replace function public.ops_update_gym_plan(p_gym_id uuid, p_plan text, p_duration_months int default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.gyms;
  v_expires timestamptz;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_plan not in ('free', 'basic', 'pro') then
    raise exception 'INVALID_PLAN';
  end if;
  if p_duration_months is not null and p_duration_months <= 0 then
    raise exception 'INVALID_DURATION';
  end if;

  v_expires := case
    when p_duration_months is not null and p_plan <> 'free' then now() + (p_duration_months || ' months')::interval
    else null
  end;

  update public.gyms
  set plan = p_plan, plan_override_expires_at = v_expires, updated_at = now()
  where id = p_gym_id
  returning * into v_result;

  if v_result.id is null then
    raise exception 'GYM_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'id', v_result.id,
    'name', v_result.name,
    'plan', v_result.plan,
    'plan_override_expires_at', v_result.plan_override_expires_at
  );
end;
$$;

grant execute on function public.ops_update_gym_plan(uuid, text, int) to authenticated;

-- ops_gym_detail: surface the override expiry so the dashboard can show
-- "이벤트 종료일: ..." on a gym that has one.
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
        'referred_by_gym_id', g.referred_by_gym_id,
        'plan_override_expires_at', g.plan_override_expires_at
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
