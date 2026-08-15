-- Public, no-login leaderboard/TV-mode view (src/routes/PublicBoardPage.tsx,
-- PublicTvPage.tsx). Deliberately NOT implemented as an `anon` RLS select
-- policy on students/jump_records: a blanket `using (true)` policy would
-- make every gym's full roster readable to anyone who enumerates gym_ids,
-- not just visitors holding one gym's slug. Routing all public reads
-- through this single SECURITY DEFINER function keeps the anon/authenticated
-- roles with zero direct grants on the raw tables, and lets us control
-- exactly which columns leave the database (student notes/branch_name are
-- deliberately excluded from the public payload).

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
        'id', r.id,
        'student_id', r.student_id,
        'event_key', r.event_key,
        'count', r.count,
        'record_date', r.record_date,
        'is_personal_best', r.is_personal_best
        -- video_url / verified_by_coach excluded from the public payload
      ))
      from public.jump_records r where r.gym_id = v_gym.id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_public_board(text) to anon, authenticated;
