-- Referral program v2. Still built-but-hidden (no end-user UI links this
-- round either -- see 0016's doc comment) -- the plan is to wait for 40
-- early-adopter gyms before adding any UI, per user request.
--
-- What changes from v1:
--   * Referred side is unchanged: flat "가입 시 BASIC 1개월 무료" via the
--     existing grant_free_month(), fired from the existing usage-bar
--     trigger the moment a referred gym crosses >=10 students / >=1 record.
--   * Referrer side becomes a cumulative milestone system instead of an
--     instant flat grant: the trigger now just increments
--     gyms.referral_success_count, and the actual reward (which plan, how
--     many months) is computed and granted later by the verify-referral-otp
--     Edge Function, gated on phone verification -- see that function for
--     the milestone table and the 24-month lifetime cap.
--   * Referral codes are a distinct per-gym value (gyms.referral_code),
--     not the slug -- so exposing a code doesn't also expose/relate to a
--     gym's public board URL.
--   * Anti-Sybil: one real phone number can only ever be tied to one gym's
--     referral-claim identity for life (referral_verified_phones PK on
--     phone), enforced once per gym on its first claim.

-- ---------------------------------------------------------------------
-- referral_code: distinct, unique per gym. Generated with a plain
-- loop-until-unique rather than as a column DEFAULT expression, because a
-- volatile DEFAULT evaluated during the ALTER TABLE backfill below isn't
-- guaranteed to see other rows' just-written values within the same
-- statement -- an explicit per-row loop avoids relying on that.
create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.gyms where referral_code = v_code);
  end loop;
  return v_code;
end;
$$;

alter table public.gyms add column if not exists referral_code text;

do $$
declare
  r record;
begin
  for r in select id from public.gyms where referral_code is null loop
    update public.gyms set referral_code = public.generate_referral_code() where id = r.id;
  end loop;
end $$;

alter table public.gyms alter column referral_code set not null;
alter table public.gyms add constraint gyms_referral_code_key unique (referral_code);
alter table public.gyms alter column referral_code set default public.generate_referral_code();

-- ---------------------------------------------------------------------
-- Milestone bookkeeping + phone-gated claim state.
alter table public.gyms add column if not exists referral_success_count int not null default 0;
alter table public.gyms add column if not exists referral_reward_claimed_count int not null default 0;
alter table public.gyms add column if not exists referral_reward_months_used int not null default 0;
alter table public.gyms add column if not exists referral_verified_phone text;

-- Service-role-only, same "RLS on, zero policies" pattern as
-- gym_subscriptions -- these are only ever touched from inside the
-- send/verify-referral-otp Edge Functions (service-role client), never
-- directly by a client.
create table public.phone_otps (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempt_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.phone_otps enable row level security;

create table public.referral_verified_phones (
  phone text primary key,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  verified_at timestamptz not null default now()
);
alter table public.referral_verified_phones enable row level security;

-- ---------------------------------------------------------------------
-- Referrer side: increment the counter instead of an instant grant. The
-- referred side (grant_free_month(p_gym_id)) is untouched.
create or replace function public.grant_referral_reward_if_eligible(p_gym_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referred_by uuid;
  v_already_granted timestamptz;
  v_student_count int;
  v_record_count int;
begin
  select referred_by_gym_id, referral_reward_granted_at
    into v_referred_by, v_already_granted
    from public.gyms where id = p_gym_id;

  if v_referred_by is null or v_already_granted is not null then
    return;
  end if;

  select count(*) into v_student_count from public.students where gym_id = p_gym_id;
  if v_student_count < 10 then
    return;
  end if;

  select count(*) into v_record_count from public.jump_records where gym_id = p_gym_id;
  if v_record_count < 1 then
    return;
  end if;

  perform public.grant_free_month(p_gym_id);
  update public.gyms set referral_success_count = referral_success_count + 1 where id = v_referred_by;

  update public.gyms set referral_reward_granted_at = now() where id = p_gym_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Referral matching switches from slug to referral_code. Postgres refuses
-- `create or replace` when a parameter NAME changes, even with the same
-- arg count/types (`cannot change name of input parameter`) -- unlike the
-- signature-shape case in 0022's ops_update_gym_plan, this always needs an
-- explicit drop first.
drop function if exists public.create_gym_with_referral(text, text, text);

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

  insert into public.gyms (owner_id, name, slug, referred_by_gym_id)
  values (v_owner_id, p_name, p_slug, v_referrer_id)
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.create_gym_with_referral(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Surface referral state in the ops dashboard's gym-detail panel only --
-- no end-user-facing RPC this round.
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
        'plan_override_expires_at', g.plan_override_expires_at,
        'referral_code', g.referral_code,
        'referral_success_count', g.referral_success_count,
        'referral_reward_claimed_count', g.referral_reward_claimed_count,
        'referral_reward_months_used', g.referral_reward_months_used,
        'referral_verified_phone', g.referral_verified_phone
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
