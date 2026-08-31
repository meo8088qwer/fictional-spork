-- Referral program (built now, not yet publicly announced -- no UI links to
-- this, it only activates via a `?ref=<gym-slug>` signup URL handed out
-- directly). A referred gym's owner earns nothing just by signing up: the
-- reward only fires once BOTH sides of "actual usage" are true (>=10
-- students, >=1 jump record), checked by a trigger on every students/
-- jump_records insert so it fires the moment the gym crosses the bar.
--
-- Reward tier defaults to 'basic' -- the plan wasn't specified in the
-- referral program spec, matching the shared 무료 +1개월 language rather
-- than a specific tier.

alter table public.gyms add column referred_by_gym_id uuid references public.gyms(id) on delete set null;
alter table public.gyms add column referral_reward_granted_at timestamptz;

-- Extends (or starts) a gym's paid access by one month from whichever is
-- later, its current next_billing_date or today -- so a free-month grant
-- stacks on top of real paid time instead of shortening it. Reuses the
-- same next_billing_date/status fields billing-charge already reads, so
-- the grant expires back to free the same way an unpaid renewal would --
-- no new expiry logic needed.
create or replace function public.grant_free_month(p_gym_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_billing date;
begin
  select next_billing_date into v_next_billing from public.gym_subscriptions where gym_id = p_gym_id;

  if not found then
    insert into public.gym_subscriptions (gym_id, desired_plan, status, billing_cycle, next_billing_date)
    values (p_gym_id, 'basic', 'active', 'monthly', (current_date + interval '1 month')::date);
  else
    update public.gym_subscriptions
    set status = 'active',
        next_billing_date = (greatest(coalesce(v_next_billing, current_date), current_date) + interval '1 month')::date,
        updated_at = now()
    where gym_id = p_gym_id;
  end if;

  update public.gyms set plan = 'basic' where id = p_gym_id and plan = 'free';
end;
$$;

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
  perform public.grant_free_month(v_referred_by);

  update public.gyms set referral_reward_granted_at = now() where id = p_gym_id;
end;
$$;

create or replace function public.trg_check_referral_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.grant_referral_reward_if_eligible(new.gym_id);
  return new;
end;
$$;

create trigger trg_referral_reward_on_student
after insert on public.students
for each row execute function public.trg_check_referral_reward();

create trigger trg_referral_reward_on_record
after insert on public.jump_records
for each row execute function public.trg_check_referral_reward();

-- The only sanctioned way to set referred_by_gym_id -- a plain client
-- insert can't set it (nothing stops a client from passing an arbitrary
-- gym_id otherwise), and gyms RLS select is owner-scoped so a new signer-up
-- can't resolve another gym's slug to an id themselves.
create or replace function public.create_gym_with_referral(p_name text, p_slug text, p_referral_slug text default null)
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

  if p_referral_slug is not null then
    -- Excludes a gym referring itself (same owner signing up a second
    -- gym account with their own referral link) -- unknown/self slugs are
    -- silently ignored rather than failing signup over it.
    select id into v_referrer_id from public.gyms
      where slug = p_referral_slug and owner_id <> v_owner_id;
  end if;

  insert into public.gyms (owner_id, name, slug, referred_by_gym_id)
  values (v_owner_id, p_name, p_slug, v_referrer_id)
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.create_gym_with_referral(text, text, text) to authenticated;
