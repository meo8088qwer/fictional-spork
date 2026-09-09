-- Some gyms don't want their students showing up on the cross-gym public
-- leaderboard even though their plan qualifies (BASIC+) -- give them an
-- explicit opt-out, checked from 마이페이지.
alter table public.gyms
  add column global_ranking_opt_out boolean not null default false;

create or replace function public.get_global_leaderboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
    select distinct on (r.student_id, r.event_key)
      r.event_key,
      r.count,
      r.record_date,
      s.name as student_name,
      s.grade,
      g.name as gym_name
    from public.jump_records r
    join public.students s on s.id = r.student_id
    join public.gyms g on g.id = r.gym_id
    where g.plan <> 'free'
      and not g.global_ranking_opt_out
      -- ponytail: hardcoded test-account exclusion list; move to a
      -- gyms.is_test flag if this grows past a couple of accounts.
      and g.owner_id not in (
        select id from auth.users where email in ('test@naver.com', 'test2@naver.com')
      )
      and r.event_key in (
        '30s_alternate', '30s_double', '30s_basic',
        '10s_alternate', '10s_double', '10s_basic'
      )
    order by r.student_id, r.event_key, r.count desc
  ) t;
$$;
