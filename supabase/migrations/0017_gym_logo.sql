-- PRO plan feature: gyms can upload their own logo, used in place of the
-- generic colored-initial avatar on the admin sidebar, public board, and TV
-- mode. Plan gating happens client-side at upload time (matches how other
-- feature-availability gates work in this app); the column/storage itself
-- has no plan check, so a gym that later downgrades keeps whatever logo it
-- already uploaded rather than losing it.
alter table public.gyms add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('gym-logos', 'gym-logos', true)
on conflict (id) do nothing;

-- Public read (logos must be visible on the public board/TV with no auth),
-- write restricted to the owning gym's own folder (gym-logos/<gym_id>/...).
create policy "gym_logos_public_read" on storage.objects
  for select using (bucket_id = 'gym-logos');

create policy "gym_logos_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gym-logos' and (storage.foldername(name))[1] = public.auth_gym_id()::text);

create policy "gym_logos_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'gym-logos' and (storage.foldername(name))[1] = public.auth_gym_id()::text)
  with check (bucket_id = 'gym-logos' and (storage.foldername(name))[1] = public.auth_gym_id()::text);

create policy "gym_logos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gym-logos' and (storage.foldername(name))[1] = public.auth_gym_id()::text);

-- get_public_board: include logo_url so the public board/TV page can show
-- the gym's uploaded logo without an authenticated call.
create or replace function public.get_public_board(p_gym_slug text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_gym record;
  result jsonb;
begin
  select id, name, slug, logo_url into v_gym from public.gyms where slug = p_gym_slug;
  if not found then
    raise exception 'GYM_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'gym', jsonb_build_object('id', v_gym.id, 'name', v_gym.name, 'slug', v_gym.slug, 'logo_url', v_gym.logo_url),
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
$function$;
