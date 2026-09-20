-- Routine health-check pass (Supabase advisors) after several features
-- shipped back to back. Three independent, low-risk hardenings -- no
-- behavior change, just closing lint warnings:

-- 1. Pin search_path on trigger functions that predate this convention,
-- so they can't be tricked by a session-level search_path change into
-- resolving an unqualified name to an attacker-created object.
alter function public.set_jump_record_gym_id() set search_path = public;
alter function public.enforce_event_limit() set search_path = public;
alter function public.enforce_student_limit() set search_path = public;
alter function public.generate_referral_code() set search_path = public;
alter function public.default_event_definitions() set search_path = public;
alter function public.prevent_default_event_deletion() set search_path = public;
alter function public.block_demo_password_change() set search_path = public;

-- 2. gyms' three RLS policies re-evaluated auth.uid() per row -- wrapping
-- it in a scalar subquery lets Postgres evaluate it once per statement
-- instead. gyms is small today but this is the standard fix regardless.
alter policy gyms_owner_select on public.gyms
  using (owner_id = (select auth.uid()));
alter policy gyms_owner_insert on public.gyms
  with check (owner_id = (select auth.uid()));
alter policy gyms_owner_update on public.gyms
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- 3. Missing covering indexes on foreign keys (5 from the new league
-- tables, 3 pre-existing) -- cheap now, avoids a slow seq scan later once
-- these tables have real rows.
create index if not exists idx_gyms_referred_by_gym_id on public.gyms(referred_by_gym_id);
create index if not exists idx_jump_records_gym_event on public.jump_records(gym_id, event_key);
create index if not exists idx_phone_otps_gym_id on public.phone_otps(gym_id);
create index if not exists idx_referral_verified_phones_gym_id on public.referral_verified_phones(gym_id);
create index if not exists idx_league_match_records_student_id on public.league_match_records(student_id);
create index if not exists idx_league_matches_gym_a_id on public.league_matches(gym_a_id);
create index if not exists idx_league_matches_gym_b_id on public.league_matches(gym_b_id);
create index if not exists idx_league_participants_gym_id on public.league_participants(gym_id);
