-- A payment cancelled/refunded directly at Toss (dashboard action, card
-- dispute, chargeback) needs a distinct status from 'failed' -- 'failed'
-- means the payment never went through, while a cancellation means it
-- succeeded and was later reversed. The toss-webhook Edge Function sets
-- this once it re-verifies a CANCELED/PARTIAL_CANCELED status directly
-- with Toss's API.
alter table public.gym_payments drop constraint gym_payments_status_check;
alter table public.gym_payments add constraint gym_payments_status_check
  check (status in ('paid', 'failed', 'canceled'));
