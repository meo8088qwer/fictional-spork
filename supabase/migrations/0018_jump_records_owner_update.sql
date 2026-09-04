-- Coaches could insert and delete measurement records but never correct a
-- typo'd count in place (0003_rls_policies.sql only granted select/insert/
-- delete on jump_records) -- the only "fix" was delete + re-add, which
-- loses the original entry order and is easy to forget. Add the matching
-- owner-scoped update policy so an admin can edit a record's count directly.
create policy records_owner_update on public.jump_records
  for update to authenticated using (gym_id = auth_gym_id()) with check (gym_id = auth_gym_id());
