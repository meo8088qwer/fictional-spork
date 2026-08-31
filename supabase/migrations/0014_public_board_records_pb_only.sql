-- Public board/TV mode (src/routes/PublicBoardPage.tsx, PublicTvPage.tsx)
-- polls this RPC every 15 seconds, and it was re-sending EVERY jump_records
-- row ever logged for the gym on every single poll -- the leaderboard only
-- ever needs one row per (student_id, event_key): the current best. As
-- history accumulates this payload grows unbounded and gets fully
-- re-transferred every 15s per open tab/TV screen, which does not scale to
-- hundreds of gyms with months of history. Switched to `distinct on` (the
-- same pattern already used correctly by get_global_leaderboard in
-- 0007_global_leaderboard_rpc.sql) so the payload is capped at
-- students x events regardless of how much history exists. This also
-- sidesteps records.ts's is_personal_best column never being cleared on a
-- since-beaten row -- every row this query returns IS the current best by
-- construction, so is_personal_best is just hardcoded true here rather
-- than trusting that column.

create or replace function public.get_public_board(p_gym_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym record;
  result jsonb;
begin
  select id, name, slug into v_gym from public.gyms where slug = p_gym_slug;
  if not found then
    raise exception 'GYM_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'gym', jsonb_build_object('id', v_gym.id, 'name', v_gym.name, 'slug', v_gym.slug),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', e.key,
        'time_seconds', e.time_seconds,
        'title', e.title,
        'short_title', e.short_title,
        'technique', e.technique,
        'icon_name', e.icon_name,
        'badge_bg', e.badge_bg,
        'badge_text', e.badge_text,
        'benchmark_good', e.benchmark_good,
        'benchmark_pro', e.benchmark_pro,
        'description', e.description,
        'is_custom', e.is_custom
      ))
      from public.events e where e.gym_id = v_gym.id
    ), '[]'::jsonb),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'student_no', s.student_no,
        'name', s.name,
        'grade', s.grade,
        'gender', s.gender,
        'avatar_color', s.avatar_color
        -- notes / branch_name deliberately excluded from the public payload
      ))
      from public.students s where s.gym_id = v_gym.id
    ), '[]'::jsonb),
    'records', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pb.id,
        'student_id', pb.student_id,
        'event_key', pb.event_key,
        'count', pb.count,
        'record_date', pb.record_date,
        'is_personal_best', true
      ))
      from (
        select distinct on (r.student_id, r.event_key)
          r.id, r.student_id, r.event_key, r.count, r.record_date
        from public.jump_records r
        where r.gym_id = v_gym.id
        order by r.student_id, r.event_key, r.count desc, r.record_date desc
      ) pb
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;
