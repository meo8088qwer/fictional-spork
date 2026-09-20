-- Gym-facing side of the league system -- 0035_league.sql built the
-- standings/scoring engine and the ops-only season creator, but never
-- gave a participating gym any way to see its own schedule or (for
-- scoring_mode = 'new_measurement') actually enter a match's scores.
-- Without this, a 'new_measurement' season was unusable end-to-end.

-- This gym's full schedule across every league season it's in: one row
-- per round, with the opponent resolved to whichever side isn't us (null
-- opponent = a bye that round, since create_league_season never inserts a
-- match row for a bye).
create or replace function public.get_my_league_matches()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'seasonId', s.id, 'seasonName', s.name, 'scoringMode', s.scoring_mode,
    'roundNo', r.round_no, 'startDate', r.start_date, 'endDate', r.end_date,
    'matchId', m.id,
    'opponentGymId', case when m.id is null then null
      when m.gym_a_id = public.auth_gym_id() then m.gym_b_id else m.gym_a_id end,
    'opponentGymName', og.name
  ) order by s.start_date desc, r.round_no), '[]'::jsonb)
  from public.league_participants p
  join public.league_seasons s on s.id = p.season_id
  join public.league_rounds r on r.season_id = s.id
  left join public.league_matches m on m.round_id = r.id
    and (m.gym_a_id = public.auth_gym_id() or m.gym_b_id = public.auth_gym_id())
  left join public.gyms og on og.id = (
    case when m.id is null then null
      when m.gym_a_id = public.auth_gym_id() then m.gym_b_id else m.gym_a_id end
  )
  where p.gym_id = public.auth_gym_id();
$$;

grant execute on function public.get_my_league_matches() to authenticated;

-- What this gym has already entered for one match ('new_measurement'
-- seasons only) -- deliberately scoped to the caller's own students, not
-- the opponent's, so entering scores doesn't double as a way to peek at
-- the other side's numbers before submitting your own.
create or replace function public.get_my_league_match_entries(p_match_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'studentId', lmr.student_id, 'studentName', st.name, 'eventKey', lmr.event_key, 'count', lmr.count
  ) order by st.name, lmr.event_key), '[]'::jsonb)
  from public.league_match_records lmr
  join public.students st on st.id = lmr.student_id
  where lmr.match_id = p_match_id
    and st.gym_id = public.auth_gym_id();
$$;

grant execute on function public.get_my_league_match_entries(uuid) to authenticated;
