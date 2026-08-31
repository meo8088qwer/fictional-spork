-- Companion to 0014's get_public_board trim: the public board page's
-- student-detail modal (growth graph) genuinely needs full history for
-- ONE student, which get_public_board no longer carries. Fetched on-demand
-- only when a parent actually clicks a student (not on every 15s poll),
-- and scoped to a single student instead of the whole gym roster.

create or replace function public.get_public_student_history(p_gym_slug text, p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
  result jsonb;
begin
  select id into v_gym_id from public.gyms where slug = p_gym_slug;
  if not found then
    raise exception 'GYM_NOT_FOUND';
  end if;

  -- p_student_id is client-supplied -- verify it actually belongs to this
  -- gym before returning anything, so a slug for gym A can't be paired
  -- with a student_id from gym B to read another gym's records.
  if not exists (
    select 1 from public.students where id = p_student_id and gym_id = v_gym_id
  ) then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'student_id', r.student_id,
    'event_key', r.event_key,
    'count', r.count,
    'record_date', r.record_date,
    'is_personal_best', r.is_personal_best
  )), '[]'::jsonb) into result
  from public.jump_records r
  where r.student_id = p_student_id and r.gym_id = v_gym_id;

  return result;
end;
$$;

grant execute on function public.get_public_student_history(text, uuid) to anon, authenticated;
