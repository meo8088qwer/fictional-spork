-- Gym owners often leave gyms.name at its signup-time default (their email
-- local-part, or a generic placeholder) instead of customizing it, so it's
-- not a reliable way to identify who a gym actually belongs to. Surface the
-- real signup email (auth.users.email) in the ops dashboard's gym list and
-- detail view instead of requiring a manual owner_id -> auth.users lookup
-- in the Supabase table editor. auth.users.encrypted_password is never
-- touched here or anywhere else -- passwords stay bcrypt-hashed by
-- Supabase Auth regardless; only the email (never a secret) is exposed,
-- and only to a platform admin (is_platform_admin() gate, unchanged).
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
  join auth.users u on u.id = g.owner_id
  where p_search is null or p_search = ''
     or g.name ilike '%' || p_search || '%'
     or g.slug ilike '%' || p_search || '%'
     or u.email ilike '%' || p_search || '%';

  select jsonb_build_object(
    'total', v_total,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'slug', g.slug,
        'plan', g.plan,
        'created_at', g.created_at,
        'email', g.email,
        'student_count', (select count(*) from public.students s where s.gym_id = g.id),
        'record_count', (select count(*) from public.jump_records r where r.gym_id = g.id),
        'last_record_date', (select max(r.record_date) from public.jump_records r where r.gym_id = g.id)
      ) order by g.created_at desc)
      from (
        select g.*, u.email
        from public.gyms g
        join auth.users u on u.id = g.owner_id
        where p_search is null or p_search = ''
           or g.name ilike '%' || p_search || '%'
           or g.slug ilike '%' || p_search || '%'
           or u.email ilike '%' || p_search || '%'
        order by g.created_at desc
        limit p_limit offset p_offset
      ) g
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- ops_gym_detail: same reasoning, add the owner's signup email.
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
        'email', u.email,
        'student_count', (select count(*) from public.students s where s.gym_id = g.id),
        'record_count', (select count(*) from public.jump_records r where r.gym_id = g.id),
        'last_record_date', (select max(r.record_date) from public.jump_records r where r.gym_id = g.id),
        'referred_by_gym_id', g.referred_by_gym_id,
        'plan_override_expires_at', g.plan_override_expires_at,
        'referral_code', g.referral_code,
        'referral_success_count', g.referral_success_count,
        'referral_reward_claimed_count', g.referral_reward_claimed_count,
        'referral_reward_months_used', g.referral_reward_months_used,
        'referral_verified_phone', g.referral_verified_phone
      )
      from public.gyms g
      join auth.users u on u.id = g.owner_id
      where g.id = p_gym_id
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
