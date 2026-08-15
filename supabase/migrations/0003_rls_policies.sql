-- Row Level Security: the hard guarantee that gym A can never read or
-- write gym B's data. Every policy below resolves the caller's gym_id
-- server-side from auth.uid() -- a client-supplied gym_id is never trusted
-- for scoping a query (see 0002's set_jump_record_gym_id for the one place
-- gym_id could otherwise be spoofed on insert).

create or replace function public.auth_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.gyms where owner_id = auth.uid();
$$;

alter table public.gyms enable row level security;
alter table public.events enable row level security;
alter table public.students enable row level security;
alter table public.jump_records enable row level security;

-- gyms: an owner can only see/manage their own gym row. No delete policy
-- (tenant deletion is out of scope for now). No anon policy at all -- the
-- public board never reads this table directly, only via the RPC in 0004.
create policy gyms_owner_select on public.gyms
  for select to authenticated using (owner_id = auth.uid());
create policy gyms_owner_insert on public.gyms
  for insert to authenticated with check (owner_id = auth.uid());
create policy gyms_owner_update on public.gyms
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- events / students / jump_records: identical owner-scoped pattern.
-- No `to anon` policy on any of these -- direct PostgREST reads by the
-- anon key are denied by default. The only sanctioned public read path is
-- the SECURITY DEFINER RPC in 0004_public_board_rpc.sql.
create policy events_owner_select on public.events
  for select to authenticated using (gym_id = auth_gym_id());
create policy events_owner_insert on public.events
  for insert to authenticated with check (gym_id = auth_gym_id());
create policy events_owner_update on public.events
  for update to authenticated using (gym_id = auth_gym_id()) with check (gym_id = auth_gym_id());
create policy events_owner_delete on public.events
  for delete to authenticated using (gym_id = auth_gym_id());

create policy students_owner_select on public.students
  for select to authenticated using (gym_id = auth_gym_id());
create policy students_owner_insert on public.students
  for insert to authenticated with check (gym_id = auth_gym_id());
create policy students_owner_update on public.students
  for update to authenticated using (gym_id = auth_gym_id()) with check (gym_id = auth_gym_id());
create policy students_owner_delete on public.students
  for delete to authenticated using (gym_id = auth_gym_id());

create policy records_owner_select on public.jump_records
  for select to authenticated using (gym_id = auth_gym_id());
create policy records_owner_insert on public.jump_records
  for insert to authenticated with check (gym_id = auth_gym_id());
create policy records_owner_delete on public.jump_records
  for delete to authenticated using (gym_id = auth_gym_id());
