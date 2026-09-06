-- Supabase's security advisor flags public.my_subscription as a
-- "Security Definer View" (CRITICAL): it was created without
-- security_invoker, so it runs with the view OWNER's privileges instead of
-- the querying user's, silently bypassing gym_subscriptions' RLS (which
-- has zero policies for `authenticated` -- "no policies, service_role
-- only" like the rest of the billing tables). The view's own
-- `where gym_id = auth_gym_id()` filter happens to make this safe today,
-- but that's incidental, not enforced -- a future edit to the view (an
-- added join, a dropped WHERE clause) would silently expose every gym's
-- subscription row with no RLS backstop to catch it.
--
-- Fix: give gym_subscriptions a real RLS policy scoped to the caller's own
-- gym (identical filter to what the view already applies), then flip the
-- view to security_invoker so it actually goes through that RLS instead
-- of running as the view's owner. Read behavior for gym owners is
-- unchanged -- same rows, now enforced by RLS instead of implied by the
-- view definition.
create policy "gym_subscriptions_select_own" on public.gym_subscriptions
  for select to authenticated
  using (gym_id = auth_gym_id());

alter view public.my_subscription set (security_invoker = true);
