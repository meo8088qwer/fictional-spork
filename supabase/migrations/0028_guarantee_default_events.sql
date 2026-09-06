-- Guarantees the 6 base events exist for every gym, unconditionally:
--   1. Seeding them is folded into create_gym_with_referral() itself, in
--      the SAME transaction as the gym insert -- previously the client did
--      this as a SEPARATE network call after gym creation (createGym() in
--      gyms.ts), which is exactly the window that produced every
--      zero-events gym seen today (gym created, then whatever came next
--      never ran). A single INSERT ... SELECT here makes "gym exists but
--      has 0 events" structurally impossible instead of just unlikely.
--   2. A BEFORE DELETE trigger blocks deleting a non-custom event
--      server-side, for every caller (not just the UI, which already hid
--      the delete button for base events -- this closes the gap where a
--      direct API call could still remove one).
--
-- DEFAULT_EVENTS' values are duplicated here from src/data/constants.ts
-- (that file stays the source of truth for the client) -- an intentional
-- trade-off so gym creation never depends on a second round-trip.
create or replace function public.default_event_definitions()
returns table (
  key text, time_seconds int, title text, short_title text, technique text,
  icon_name text, badge_bg text, badge_text text, benchmark_good int, benchmark_pro int, description text
)
language sql
immutable
as $$
  values
    ('30s_basic', 30, '30초 양발모아뛰기', '30초 양발', '양발모아뛰기', 'Footprints', 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', '기본 스피드', 110, 140, '30초 동안 양발을 붙이고 일정한 박자로 빠르게 넘는 기초 스피드 종목입니다.'),
    ('30s_alternate', 30, '30초 번갈아뛰기', '30초 번갈아', '번갈아뛰기', 'Zap', 'bg-blue-500/10 text-blue-600 border-blue-500/30', '민첩성 스피드', 80, 95, '30초 동안 오른발과 왼발을 번갈아 디디며 순발력과 템포를 다투는 대표 스피드 종목입니다.'),
    ('30s_double', 30, '30초 이중뛰기', '30초 이중', '이중뛰기', 'Flame', 'bg-amber-500/10 text-amber-600 border-amber-500/30', '고난도 스피드', 75, 90, '1회 점프에 줄을 2번 회전시키는 이중뛰기(쌩쌩이)의 30초 한계 도전 종목입니다.'),
    ('10s_basic', 10, '10초 양발모아뛰기', '10초 양발', '양발모아뛰기', 'Clock', 'bg-purple-500/10 text-purple-600 border-purple-500/30', '단거리 양발', 36, 46, '10초의 극짧은 순간 동안 순발력 있게 양발을 모아 넘는 단거리 순발력 측정입니다.'),
    ('10s_alternate', 10, '10초 번갈아뛰기', '10초 번갈아', '번갈아뛰기', 'Gauge', 'bg-rose-500/10 text-rose-600 border-rose-500/30', '순발력 폭발', 26, 31, '10초 동안 초고속발짓으로 정밀도와 스피드의 한계를 겨루는 최고 인기 종목입니다.'),
    ('10s_double', 10, '10초 이중뛰기', '10초 이중', '이중뛰기', 'Trophy', 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30', '단거리 이중', 25, 30, '10초 동안 무결점으로 빠르게 이중뛰기를 성공시켜야 하는 순간 집중력 종목입니다.')
$$;

create or replace function public.create_gym_with_referral(p_name text, p_slug text, p_referral_code text default null)
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

  if p_referral_code is not null then
    select id into v_referrer_id from public.gyms
      where referral_code = p_referral_code and owner_id <> v_owner_id;
  end if;

  insert into public.gyms (owner_id, name, slug, referred_by_gym_id)
  values (v_owner_id, p_name, p_slug, v_referrer_id)
  returning * into v_result;

  insert into public.events (
    gym_id, key, time_seconds, title, short_title, technique,
    icon_name, badge_bg, badge_text, benchmark_good, benchmark_pro, description, is_custom
  )
  select v_result.id, d.key, d.time_seconds, d.title, d.short_title, d.technique,
         d.icon_name, d.badge_bg, d.badge_text, d.benchmark_good, d.benchmark_pro, d.description, false
  from public.default_event_definitions() d;

  return v_result;
end;
$$;

grant execute on function public.create_gym_with_referral(text, text, text) to authenticated;

-- Blocks deleting a base event through ANY path (client bug, direct API
-- call), not just the UI, which already only ever offers a delete button
-- for is_custom events.
create or replace function public.prevent_default_event_deletion()
returns trigger
language plpgsql
as $$
begin
  -- Only block a standalone delete of a base event while its gym still
  -- exists -- if the gym itself is gone (e.g. an admin/ops cleanup
  -- cascading the delete down from gyms), let the cascade finish instead
  -- of leaving a gym deletion permanently stuck on its own default events.
  if not old.is_custom and exists (select 1 from public.gyms where id = old.gym_id) then
    raise exception 'DEFAULT_EVENT_CANNOT_BE_DELETED';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_default_event_deletion on public.events;
create trigger trg_prevent_default_event_deletion
before delete on public.events
for each row execute function public.prevent_default_event_deletion();

-- Backfill: any existing gym missing one of the 6 base events (e.g. the
-- handful stuck with zero events by today's bug, already patched by hand,
-- but covering any other gap too) gets it inserted now.
insert into public.events (
  gym_id, key, time_seconds, title, short_title, technique,
  icon_name, badge_bg, badge_text, benchmark_good, benchmark_pro, description, is_custom
)
select g.id, d.key, d.time_seconds, d.title, d.short_title, d.technique,
       d.icon_name, d.badge_bg, d.badge_text, d.benchmark_good, d.benchmark_pro, d.description, false
from public.gyms g
cross join public.default_event_definitions() d
where not exists (
  select 1 from public.events e where e.gym_id = g.id and e.key = d.key
);
