-- ============================================================================
-- Demo data seed for test/QA accounts -- FREE vs BASIC plan comparison.
--
-- Usage:
--   1. Sign up in the app for each email below (creates the auth user + gym
--      + 6 default events). test@naver.com already exists; sign up
--      tset2@naver.com the same way before running this.
--   2. Run this whole script once in the Supabase SQL Editor. It (re)defines
--      seed_demo_gym() and calls it for both test accounts.
--   3. Log in with each email: both get 50 students with 6 months of growth
--      records per event. test@naver.com is set to the free plan,
--      tset2@naver.com to basic, so plan-gated features can be compared.
--
-- Safe to re-run: each call wipes and regenerates only that gym's
-- students/records, and sets its plan.
-- ============================================================================

create or replace function seed_demo_gym(p_email text, p_plan text, p_student_count int default 50, p_months int default 6)
returns void
language plpgsql
as $$
declare
  v_gym_id uuid;
begin
  select id into v_gym_id from gyms
  where owner_id = (select id from auth.users where email = p_email);

  if v_gym_id is null then
    raise exception '해당 이메일로 가입된 체육관을 찾을 수 없습니다. 먼저 앱에서 회원가입한 뒤 다시 실행해 주세요. (%)', p_email;
  end if;

  update gyms set plan = p_plan where id = v_gym_id;

  delete from jump_records where gym_id = v_gym_id;
  delete from students where gym_id = v_gym_id;

  -- 50 students spread across every grade band and both genders.
  with names(n, name, grade, gender) as (
    values
      (1,'강도현','초등 3학년','M'),  (2,'이서준','초등 4학년','M'),  (3,'박민준','초등 2학년','M'),
      (4,'최지우','초등 5학년','F'),  (5,'김하은','초등 3학년','F'),  (6,'정우진','초등 6학년','M'),
      (7,'한소율','유치부 5세','F'),  (8,'오민서','초등 1학년','F'),  (9,'장하윤','중학생','F'),
      (10,'윤지호','초등 4학년','M'), (11,'임서연','초등 2학년','F'), (12,'조은우','고등학생','M'),
      (13,'신예준','유치부 6세','M'), (14,'배지안','초등 1학년','F'), (15,'권도윤','초등 5학년','M'),
      (16,'황서윤','초등 6학년','F'), (17,'안현우','중학생','M'),     (18,'송지호','초등 3학년','M'),
      (19,'유나은','초등 2학년','F'), (20,'홍시우','유치부 7세','M'), (21,'문채원','초등 4학년','F'),
      (22,'양준서','초등 1학년','M'), (23,'서아윤','초등 6학년','F'), (24,'노태윤','고등학생','M'),
      (25,'백수아','초등 5학년','F'), (26,'남건우','초등 2학년','M'), (27,'심유진','유치부 6세','F'),
      (28,'표시윤','초등 3학년','F'), (29,'구민재','중학생','M'),     (30,'육하린','초등 4학년','F'),
      (31,'김도윤','유치부 5세','M'), (32,'이하윤','유치부 6세','F'), (33,'박서진','유치부 7세','M'),
      (34,'최은우','초등 1학년','F'), (35,'정시우','초등 2학년','M'), (36,'강예은','초등 3학년','F'),
      (37,'조민재','초등 4학년','M'), (38,'윤서아','초등 5학년','F'), (39,'임도현','초등 6학년','M'),
      (40,'한지안','중학생','F'),     (41,'오태민','고등학생','M'),   (42,'신하율','유치부 5세','F'),
      (43,'배준혁','초등 1학년','M'), (44,'권나윤','초등 2학년','F'), (45,'황시윤','초등 3학년','M'),
      (46,'안유진','초등 4학년','F'), (47,'송민호','초등 5학년','M'), (48,'유채은','초등 6학년','F'),
      (49,'문승우','중학생','M'),     (50,'양지수','고등학생','F')
  )
  insert into students (gym_id, student_no, name, grade, gender, avatar_color, join_date)
  select
    v_gym_id,
    '2026-' || lpad(n::text, 3, '0'),
    name, grade, gender,
    (array['from-orange-500 to-amber-500','from-blue-500 to-cyan-500','from-emerald-500 to-teal-500',
           'from-purple-500 to-pink-500','from-indigo-500 to-purple-500','from-rose-500 to-red-500'])[1 + (n % 6)],
    current_date - ((51 - n) * 6)
  from names
  where n <= p_student_count;

  -- p_months x 6 events per student, each (student, event) pair growing
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
    (date_trunc('month', current_date) - make_interval(months => (p_months - 1) - month_offset))::date + floor(random() * 20)::int,
    '체육관 관리자'
  from student_event_base
  cross join generate_series(0, p_months - 1) as m(month_offset);

  -- a handful of this-week records so "미입력 학생" / TV mode aren't empty
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
end;
$$;

select seed_demo_gym('test@naver.com', 'free', 50, 6);
select seed_demo_gym('tset2@naver.com', 'basic', 50, 6);
