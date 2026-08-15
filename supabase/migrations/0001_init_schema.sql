-- Core multi-tenant schema: one gym (tenant) per authenticated owner.
--
-- Design note: this intentionally models 1 gym = 1 owner_id, not a
-- gym_members join table. Multi-staff gyms are a real future need, but
-- adding gym_members now would force every RLS policy below into an
-- EXISTS subquery for a feature nobody has asked for yet. When that need
-- shows up: add `create table gym_members (gym_id, user_id, role)`, then
-- widen the auth_gym_id() helper in 0003_rls_policies.sql to look up via
-- membership instead of owner_id -- no schema change needed here.

create extension if not exists pgcrypto;

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  key text not null,
  time_seconds int not null,
  title text not null,
  short_title text not null,
  technique text not null,
  icon_name text,
  badge_bg text,
  badge_text text,
  benchmark_good int,
  benchmark_pro int,
  description text,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  unique (gym_id, key)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  student_no text not null,
  name text not null,
  grade text not null,
  gender text not null check (gender in ('M', 'F')),
  avatar_color text,
  join_date date not null default current_date,
  notes text,
  branch_name text,
  created_at timestamptz not null default now(),
  unique (gym_id, student_no)
);

create table public.jump_records (
  id uuid primary key default gen_random_uuid(),
  -- gym_id is NOT trusted from client inserts -- it's populated server-side
  -- from student_id by the trigger in 0002_plan_limit_triggers.sql, so a
  -- malicious client can never attach a record to another gym's tenant.
  gym_id uuid not null references public.gyms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  event_key text not null,
  count int not null check (count > 0),
  record_date date not null,
  is_personal_best boolean not null default false,
  is_gym_record boolean not null default false,
  video_url text,
  verified_by_coach text,
  created_at timestamptz not null default now(),
  foreign key (gym_id, event_key) references public.events(gym_id, key) on delete restrict
);

create index idx_events_gym_id on public.events(gym_id);
create index idx_students_gym_id on public.students(gym_id);
create index idx_jump_records_gym_id on public.jump_records(gym_id);
create index idx_jump_records_student_event on public.jump_records(student_id, event_key);
