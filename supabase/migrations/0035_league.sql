-- 체육관 대항 리그전 (match-based, 1:1 round-robin).
--
-- A season has N participating gyms and N-1 rounds (circle-method
-- round-robin: if N is odd, one gym gets a bye each round instead).
-- Each round is a fixed date window; every match in that round pits
-- exactly two gyms' students against each other, scored per default
-- event by percentile bucket (top 10% = 5pts, top 30% = 4, top 50% = 3,
-- top 80% = 2, everyone else = 1; a student who didn't participate that
-- round simply contributes nothing, i.e. 0). Individual points sum into
-- a club's round score, which accumulates into the season standings.
--
-- Cross-tenant by design (a season spans multiple independently-owned
-- gyms), so unlike every other table in this app it is NOT scoped by
-- normal per-gym RLS -- it's platform-admin-created (see
-- create_league_season) and publicly readable (see get_league_standings),
-- matching get_global_leaderboard's existing pattern of "no direct table
-- policies, only a SECURITY DEFINER RPC surface".

create table public.league_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- 'existing_records': use each gym's normal jump_records within the
  -- round's date window (no extra data entry, but a gym's regular
  -- day-to-day training numbers double as their league score).
  -- 'new_measurement': scored from a separate one-off measurement
  -- (league_match_records below) that never touches jump_records/PBs.
  scoring_mode text not null check (scoring_mode in ('existing_records', 'new_measurement')),
  round_days int not null default 30 check (round_days > 0),
  start_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'canceled')),
  created_at timestamptz not null default now()
);

create table public.league_participants (
  season_id uuid not null references public.league_seasons(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  primary key (season_id, gym_id)
);

create table public.league_rounds (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.league_seasons(id) on delete cascade,
  round_no int not null,
  start_date date not null,
  end_date date not null,
  unique (season_id, round_no)
);

create table public.league_matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.league_rounds(id) on delete cascade,
  gym_a_id uuid not null references public.gyms(id) on delete cascade,
  -- null gym_b_id = gym_a has a bye this round (only possible with an
  -- odd number of participating gyms).
  gym_b_id uuid references public.gyms(id) on delete cascade,
  unique (round_id, gym_a_id)
);

-- Only populated for scoring_mode = 'new_measurement' seasons -- a
-- dedicated one-off measurement per match, kept fully separate from a
-- gym's real jump_records/personal-best history.
create table public.league_match_records (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.league_matches(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  event_key text not null check (event_key in (
    '30s_basic', '30s_alternate', '30s_double', '10s_basic', '10s_alternate', '10s_double'
  )),
  count int not null check (count > 0),
  recorded_at timestamptz not null default now(),
  unique (match_id, student_id, event_key)
);

alter table public.league_seasons enable row level security;
alter table public.league_participants enable row level security;
alter table public.league_rounds enable row level security;
alter table public.league_matches enable row level security;
alter table public.league_match_records enable row level security;

-- Deliberately no policies on any of the five tables -- every read goes
-- through get_league_standings()/list_league_seasons() (SECURITY DEFINER,
-- granted to anon+authenticated) and every write through
-- create_league_season()/submit_league_match_record() below. Direct table
-- access stays refused for everyone, service_role included implicitly.

-- Generates the round-robin schedule with the standard "circle method":
-- fix the first gym, rotate the rest by one position each round. An odd
-- gym count gets a null seat appended first, and whichever real gym is
-- paired against that null seat in a given round has a bye that round.
create or replace function public.create_league_season(
  p_name text,
  p_gym_ids uuid[],
  p_scoring_mode text,
  p_round_days int default 30,
  p_start_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season_id uuid;
  v_gym_ids uuid[] := p_gym_ids;
  v_n int;
  v_rounds int;
  v_round_id uuid;
  v_i int;
  v_r int;
  v_home uuid;
  v_away uuid;
  v_round_start date;
  v_round_end date;
  v_fixed uuid;
  v_rest uuid[];
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_scoring_mode not in ('existing_records', 'new_measurement') then
    raise exception 'INVALID_SCORING_MODE';
  end if;
  if p_gym_ids is null or array_length(p_gym_ids, 1) < 2 then
    raise exception 'NEED_AT_LEAST_TWO_GYMS';
  end if;

  if array_length(v_gym_ids, 1) % 2 = 1 then
    v_gym_ids := v_gym_ids || array[null::uuid];
  end if;
  v_n := array_length(v_gym_ids, 1);
  v_rounds := v_n - 1;

  insert into public.league_seasons (name, scoring_mode, round_days, start_date)
  values (p_name, p_scoring_mode, p_round_days, p_start_date)
  returning id into v_season_id;

  insert into public.league_participants (season_id, gym_id)
  select v_season_id, g from unnest(p_gym_ids) as g;

  v_fixed := v_gym_ids[1];
  v_rest := v_gym_ids[2:v_n];

  for v_r in 0..v_rounds - 1 loop
    v_round_start := p_start_date + (v_r * p_round_days);
    v_round_end := v_round_start + (p_round_days - 1);

    insert into public.league_rounds (season_id, round_no, start_date, end_date)
    values (v_season_id, v_r + 1, v_round_start, v_round_end)
    returning id into v_round_id;

    v_home := v_fixed;
    v_away := v_rest[array_length(v_rest, 1)];
    if v_home is not null then
      insert into public.league_matches (round_id, gym_a_id, gym_b_id) values (v_round_id, v_home, v_away);
    elsif v_away is not null then
      insert into public.league_matches (round_id, gym_a_id, gym_b_id) values (v_round_id, v_away, null);
    end if;

    for v_i in 1..(array_length(v_rest, 1) - 1) / 2 loop
      v_home := v_rest[v_i];
      v_away := v_rest[array_length(v_rest, 1) - v_i];
      if v_home is not null then
        insert into public.league_matches (round_id, gym_a_id, gym_b_id) values (v_round_id, v_home, v_away);
      elsif v_away is not null then
        insert into public.league_matches (round_id, gym_a_id, gym_b_id) values (v_round_id, v_away, null);
      end if;
    end loop;

    v_rest := array[v_rest[array_length(v_rest, 1)]] || v_rest[1:array_length(v_rest, 1) - 1];
  end loop;

  return v_season_id;
end;
$$;

grant execute on function public.create_league_season(text, uuid[], text, int, date) to authenticated;

-- Score-entry for 'new_measurement' seasons -- either gym in the match
-- can enter/update its own students' counts for that match. Rejected for
-- 'existing_records' seasons since those are scored straight from
-- jump_records instead.
create or replace function public.submit_league_match_record(
  p_match_id uuid,
  p_student_id uuid,
  p_event_key text,
  p_count int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid := public.auth_gym_id();
  v_gym_a uuid;
  v_gym_b uuid;
  v_season_id uuid;
  v_scoring_mode text;
  v_student_gym uuid;
begin
  if v_gym_id is null then
    raise exception 'NO_GYM';
  end if;
  if p_count <= 0 then
    raise exception 'INVALID_COUNT';
  end if;

  select m.gym_a_id, m.gym_b_id, r.season_id
    into v_gym_a, v_gym_b, v_season_id
  from public.league_matches m
  join public.league_rounds r on r.id = m.round_id
  where m.id = p_match_id;
  if not found then
    raise exception 'MATCH_NOT_FOUND';
  end if;
  if v_gym_id not in (v_gym_a, v_gym_b) then
    raise exception 'FORBIDDEN';
  end if;

  select scoring_mode into v_scoring_mode from public.league_seasons where id = v_season_id;
  if v_scoring_mode <> 'new_measurement' then
    raise exception 'WRONG_SCORING_MODE';
  end if;

  select gym_id into v_student_gym from public.students where id = p_student_id;
  if v_student_gym is distinct from v_gym_id then
    raise exception 'STUDENT_NOT_YOURS';
  end if;

  insert into public.league_match_records (match_id, student_id, event_key, count)
  values (p_match_id, p_student_id, p_event_key, p_count)
  on conflict (match_id, student_id, event_key)
  do update set count = excluded.count, recorded_at = now();
end;
$$;

grant execute on function public.submit_league_match_record(uuid, uuid, text, int) to authenticated;

create or replace function public.list_league_seasons()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(t) order by t.start_date desc), '[]'::jsonb) from (
    select s.id, s.name, s.scoring_mode, s.status, s.start_date,
      (select count(*) from public.league_rounds where season_id = s.id) as rounds_count,
      (select count(*) from public.league_participants where season_id = s.id) as gym_count
    from public.league_seasons s
  ) t;
$$;

grant execute on function public.list_league_seasons() to authenticated, anon;

-- The whole standings surface for one season: club leaderboard (with a
-- round-by-round score array for the trend chart), and the top
-- individual scorers. Byes score 0 for that round (a bye match is never
-- inserted into league_matches, so it just never contributes).
create or replace function public.get_league_standings(p_season_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with season as (
  select * from public.league_seasons where id = p_season_id
),
matches as (
  select m.id as match_id, r.round_no, r.start_date, r.end_date, m.gym_a_id, m.gym_b_id
  from public.league_matches m
  join public.league_rounds r on r.id = m.round_id
  where r.season_id = p_season_id
),
raw_counts as (
  select mt.match_id, mt.round_no, s.id as student_id, s.name as student_name, s.grade, s.gym_id,
    jr.event_key, max(jr.count) as count
  from matches mt
  join public.students s on s.gym_id in (mt.gym_a_id, mt.gym_b_id)
  join public.jump_records jr on jr.student_id = s.id
    and jr.record_date between mt.start_date and mt.end_date
    and jr.event_key in ('30s_basic', '30s_alternate', '30s_double', '10s_basic', '10s_alternate', '10s_double')
  where (select scoring_mode from season) = 'existing_records'
  group by mt.match_id, mt.round_no, s.id, s.name, s.grade, s.gym_id, jr.event_key

  union all

  select mt.match_id, mt.round_no, s.id, s.name, s.grade, s.gym_id, lmr.event_key, lmr.count
  from matches mt
  join public.students s on s.gym_id in (mt.gym_a_id, mt.gym_b_id)
  join public.league_match_records lmr on lmr.match_id = mt.match_id and lmr.student_id = s.id
  where (select scoring_mode from season) = 'new_measurement'
),
ranked as (
  select *,
    rank() over (partition by match_id, event_key order by count desc) as rnk,
    count(*) over (partition by match_id, event_key) as pool_size
  from raw_counts
),
points as (
  select match_id, round_no, student_id, student_name, grade, gym_id,
    case
      when pool_size = 1 then 5
      when rnk::numeric / pool_size <= 0.10 then 5
      when rnk::numeric / pool_size <= 0.30 then 4
      when rnk::numeric / pool_size <= 0.50 then 3
      when rnk::numeric / pool_size <= 0.80 then 2
      else 1
    end as point
  from ranked
),
student_round_totals as (
  select round_no, student_id, student_name, grade, gym_id, sum(point) as round_points
  from points
  group by round_no, student_id, student_name, grade, gym_id
),
club_round_totals as (
  select gym_id, round_no, sum(round_points) as pts
  from student_round_totals
  group by gym_id, round_no
),
all_club_rounds as (
  select p.gym_id, r.round_no
  from public.league_participants p
  cross join public.league_rounds r
  where p.season_id = p_season_id and r.season_id = p_season_id
),
club_round_filled as (
  select acr.gym_id, acr.round_no, coalesce(crt.pts, 0)::int as pts
  from all_club_rounds acr
  left join club_round_totals crt on crt.gym_id = acr.gym_id and crt.round_no = acr.round_no
),
club_totals as (
  select gym_id, sum(pts)::int as total_score, array_agg(pts order by round_no) as round_scores
  from club_round_filled
  group by gym_id
),
athlete_totals as (
  select student_id, student_name, grade, gym_id, sum(round_points)::int as total_points
  from student_round_totals
  group by student_id, student_name, grade, gym_id
)
select jsonb_build_object(
  'season', jsonb_build_object(
    'id', se.id, 'name', se.name, 'scoringMode', se.scoring_mode,
    'roundsCount', (select count(*) from public.league_rounds where season_id = p_season_id)
  ),
  'clubs', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'gymId', ct.gym_id, 'gymName', g.name, 'totalScore', ct.total_score,
      'roundScores', ct.round_scores,
      'dominance', round(ct.total_score::numeric / nullif(mx.max_score, 0) * 100)
    ) order by ct.total_score desc), '[]'::jsonb)
    from club_totals ct
    join public.gyms g on g.id = ct.gym_id
    cross join (select max(total_score) as max_score from club_totals) mx
  ),
  'athletes', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'studentId', at.student_id, 'name', at.student_name, 'grade', at.grade,
      'gymId', at.gym_id, 'gymName', g.name, 'totalPoints', at.total_points
    ) order by at.total_points desc), '[]'::jsonb)
    from (select * from athlete_totals order by total_points desc limit 100) at
    join public.gyms g on g.id = at.gym_id
  )
)
from season se;
$$;

grant execute on function public.get_league_standings(uuid) to authenticated, anon;
