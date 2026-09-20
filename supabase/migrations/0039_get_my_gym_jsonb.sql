-- Root cause of "get_my_gym returned a truthy non-gym value" (the
-- Sentry warning that turned out to have actually stranded 3 real
-- signups with no gym before src/data/api/gyms.ts's defensive
-- `if (!data.id)` guard was added): get_my_gym() was declared
-- `returns gyms` (a composite/table type). Its `if v_gym.id is null then
-- return null` branch DOES return a genuine SQL NULL at the plpgsql
-- level, but PostgREST serializes a NULL of a composite return type by
-- emitting every column as JSON null (`{"id":null,"name":null,...}`)
-- instead of a bare JSON `null` -- exactly the shape captured in the
-- Sentry payload. The frontend guard papers over this after the fact;
-- this fixes it at the source by returning jsonb explicitly (same
-- pattern already used by get_league_standings, get_global_leaderboard,
-- etc.) so "no gym" now serializes as unambiguous JSON null.
--
-- No other SQL calls get_my_gym() as a composite (checked: only
-- 0022/0027/0033's comments reference it), so changing the return type
-- is safe. The frontend's existing null/id guard in getMyGym() stays as
-- defense in depth -- this just removes the actual cause of it firing.
drop function public.get_my_gym();

create function public.get_my_gym()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym public.gyms;
begin
  select * into v_gym from public.gyms where owner_id = auth.uid();
  if v_gym.id is null then
    return null;
  end if;

  if v_gym.plan_override_expires_at is not null and v_gym.plan_override_expires_at < now() then
    update public.gyms
    set plan = 'free', plan_override_expires_at = null, updated_at = now()
    where id = v_gym.id
    returning * into v_gym;
  end if;

  return to_jsonb(v_gym);
end;
$$;

grant execute on function public.get_my_gym() to authenticated;
