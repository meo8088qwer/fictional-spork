-- Bug fix: a bye is stored as a real league_matches row with gym_b_id
-- null (see create_league_season -- "elsif v_away is not null" branch),
-- not as the absence of a row. get_league_standings's `matches` CTE
-- didn't filter those out, so `s.gym_id in (mt.gym_a_id, mt.gym_b_id)`
-- with gym_b_id = null still matched the bye'd gym's own students against
-- nobody -- a percentile pool of size 1 hits the `pool_size = 1 then 5`
-- case, so every one of their students auto-scored 5 points per event
-- purely for having a record that period. Confirmed live: a bye round
-- scored 949 points against real matches scoring 549/497 the same round.
-- Fix: exclude bye rows before computing raw_counts at all, so a bye
-- round falls through to club_round_filled's existing zero-fill instead.
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
  where r.season_id = p_season_id and m.gym_b_id is not null
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

-- Defense in depth: submit_league_match_record already checks the
-- caller's gym is one of the two sides, which a bye row's gym_a still
-- passes (gym_b is just null) -- explicitly reject entering scores
-- against a bye instead of silently accepting data that get_league_standings
-- now always ignores anyway.
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
  if v_gym_b is null then
    raise exception 'BYE_ROUND';
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
