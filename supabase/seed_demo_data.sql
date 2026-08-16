-- ============================================================================
-- Demo data seed for a test/QA account.
--
-- Usage:
--   1. Sign up in the app (https://fictional-spork-two.vercel.app/signup)
--      with the email below (or edit it to match). This creates the auth
--      user + gym + 6 default events.
--   2. Run this whole script once in the Supabase SQL Editor.
--   3. Log in with that email to see 30 students with 3 months of varied
--      records per event -- ranks, counts, and growth charts all populated.
--
-- Safe to re-run: it wipes and regenerates only this gym's students/records.
-- ============================================================================

do $$
declare
  v_gym_id uuid;
begin
  select id into v_gym_id from gyms
  where owner_id = (select id from auth.users where email = 'demo-gym@example.com');

  if v_gym_id is null then
    raise exception '해당 이메일로 가입된 체육관을 찾을 수 없습니다. 먼저 앱에서 회원가입한 뒤 다시 실행해 주세요. (demo-gym@example.com)';
  end if;

  delete from jump_records where gym_id = v_gym_id;
  delete from students where gym_id = v_gym_id;

  -- 30 students spread across every grade band and both genders --
  -- at least 5 per event once records are generated below.
  with names(n, name, grade, gender) as (
    values
      (1,'강도현','초등 3학년','M'),  (2,'이서준','초등 4학년','M'),  (3,'박민준','초등 2학년','M'),
      (4,'최지우','초등 5학년','F'),  (5,'김하은','초등 3학년','F'),  (6,'정우진','초등 6학년','M'),
      (7,'한소율','유치부','F'),      (8,'오민서','초등 1학년','F'),  (9,'장하윤','중고등부','F'),
      (10,'윤지호','초등 4학년','M'), (11,'임서연','초등 2학년','F'), (12,'조은우','중고등부','M'),
      (13,'신예준','유치부','M'),     (14,'배지안','초등 1학년','F'), (15,'권도윤','초등 5학년','M'),
      (16,'황서윤','초등 6학년','F'), (17,'안현우','중고등부','M'),   (18,'송지호','초등 3학년','M'),
      (19,'유나은','초등 2학년','F'), (20,'홍시우','유치부','M'),     (21,'문채원','초등 4학년','F'),
      (22,'양준서','초등 1학년','M'), (23,'서아윤','초등 6학년','F'), (24,'노태윤','중고등부','M'),
      (25,'백수아','초등 5학년','F'), (26,'남건우','초등 2학년','M'), (27,'심유진','유치부','F'),
      (28,'표시윤','초등 3학년','F'), (29,'구민재','중고등부','M'),   (30,'육하린','초등 4학년','F')
  )
  insert into students (gym_id, student_no, name, grade, gender, avatar_color, join_date)
  select
    v_gym_id,
    '2026-' || lpad(n::text, 3, '0'),
    name, grade, gender,
    (array['from-orange-500 to-amber-500','from-blue-500 to-cyan-500','from-emerald-500 to-teal-500',
           'from-purple-500 to-pink-500','from-indigo-500 to-purple-500','from-rose-500 to-red-500'])[1 + (n % 6)],
    current_date - ((31 - n) * 6)
  from names;

  -- 3 months x 6 events per student, each (student, event) pair growing
  -- month over month so the growth chart has a real upward trend.
  with student_event_base as (
    select s.id as student_id, e.key as event_key, (25 + floor(random() * 50))::int as base_count
    from students s
    cross join (select key from events where gym_id = v_gym_id) e
    where s.gym_id = v_gym_id
  )
  insert into jump_records (gym_id, student_id, event_key, count, record_date, verified_by_coach)
  select
    v_gym_id,
    student_id,
    event_key,
    greatest(1, base_count + month_offset * (6 + floor(random() * 8)::int) + floor(random() * 10 - 5)::int),
    (date_trunc('month', current_date) - make_interval(months => 2 - month_offset))::date + floor(random() * 20)::int,
    '체육관 관리자'
  from student_event_base
  cross join generate_series(0, 2) as m(month_offset);

  -- a handful of this-week records so "실시간 기록 현황" / "이번 주 TOP 5" aren't empty
  insert into jump_records (gym_id, student_id, event_key, count, record_date, verified_by_coach)
  select
    v_gym_id,
    s.id,
    (array['30s_alternate','30s_double','30s_basic','10s_alternate','10s_double','10s_basic'])[1 + floor(random() * 6)::int],
    (50 + floor(random() * 90))::int,
    current_date - floor(random() * 6)::int,
    '체육관 관리자'
  from students s, generate_series(1, 2)
  where s.gym_id = v_gym_id;

  -- flag the true personal best per (student, event) -- matches app behavior
  update jump_records r
  set is_personal_best = true
  from (
    select distinct on (student_id, event_key) id
    from jump_records
    where gym_id = v_gym_id
    order by student_id, event_key, count desc
  ) pb
  where r.id = pb.id;
end $$;
