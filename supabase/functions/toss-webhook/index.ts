// Receives Toss Payments webhook events so a cancellation/refund done
// directly at Toss (dashboard action, customer service, card dispute)
// gets reflected here automatically -- without this, a gym that got
// refunded outside our app would keep showing "이용중" forever, since
// nothing else in this codebase ever re-checks a payment's status with
// Toss after the initial confirm.
//
// Security: Toss webhook payloads aren't signed, so this never trusts the
// POST body's status field directly (anyone could POST a fake
// cancellation to this public URL) -- it only reads `paymentKey` out of
// the payload, then re-fetches the authoritative status from Toss's own
// API using our secret key and acts on THAT. This is Toss's own
// recommended webhook verification pattern.
//
// Deploy this with JWT verification OFF (Toss can't send a Supabase JWT).
//
// Self-contained (no ../_shared imports) so it can be pasted directly into
// Supabase's browser-based Edge Function editor as a single file.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

function authHeader(secretKey: string): string {
  return `Basic ${btoa(`${secretKey}:`)}`;
}

Deno.serve(async (req) => {
  // Always answer 200 (even on error) so Toss doesn't treat this as a
  // delivery failure and retry-storm the endpoint -- errors are logged
  // instead, for us to check manually.
  try {
    if (req.method !== 'POST') return new Response('ok');

    const body = await req.json().catch(() => null);
    const paymentKey = body?.data?.paymentKey;
    if (!paymentKey) return new Response('ok');

    const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY')!;
    const res = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}`, {
      headers: { Authorization: authHeader(tossSecretKey) },
    });
    if (!res.ok) {
      console.error('toss-webhook: payment lookup failed', paymentKey, await res.text());
      return new Response('ok');
    }
    const payment = await res.json();

    // Only a cancellation needs action here -- a fresh DONE is already
    // handled by billing-issue's own confirm flow.
    if (payment.status !== 'CANCELED' && payment.status !== 'PARTIAL_CANCELED') {
      return new Response('ok');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: paymentRow } = await admin
      .from('gym_payments')
      .select('gym_id')
      .eq('order_id', payment.orderId)
      .maybeSingle();
    if (!paymentRow) {
      console.error('toss-webhook: no matching gym_payments row for orderId', payment.orderId);
      return new Response('ok');
    }

    await admin.from('gym_payments').update({ status: 'canceled' }).eq('order_id', payment.orderId);
    await admin.from('gym_subscriptions').update({ status: 'canceled' }).eq('gym_id', paymentRow.gym_id);
    await admin.from('gyms').update({ plan: 'free' }).eq('id', paymentRow.gym_id);

    return new Response('ok');
  } catch (err) {
    console.error('toss-webhook error', err);
    return new Response('ok');
  }
});
