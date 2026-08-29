// Called right after the browser comes back from Toss's hosted payment
// widget. Confirms the one-time card payment (server-side, with the secret
// key) and activates the subscription for one billing cycle.
//
// INTERIM FLOW: this gym's Toss account doesn't have 자동결제(빌링)
// contract approval yet, so this uses a regular one-time payment (no
// contract required) instead of billing-key registration. It does NOT
// auto-renew -- billing-charge/index.ts's expiry check downgrades a gym
// back to free if next_billing_date passes without a manual re-payment.
// Once the 자동결제 contract is approved: swap src/lib/tossPayments.ts's
// PricingPage call back to requestCardRegistration, and this function back
// to calling POST /v1/billing/authorizations/issue + charging the
// billingKey (see git history for the previous version of this file).
//
// Self-contained (no ../_shared imports) so it can be pasted directly into
// Supabase's browser-based Edge Function editor as a single file.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

function authHeader(secretKey: string): string {
  return `Basic ${btoa(`${secretKey}:`)}`;
}

interface TossPaymentConfirmResult {
  paymentKey: string;
  status: string;
  totalAmount: number;
  cardCompany?: string;
  cardNumber?: string;
  card?: { company?: string; number?: string };
}

async function confirmOneTimePayment(
  secretKey: string,
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<TossPaymentConfirmResult> {
  const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: { Authorization: authHeader(secretKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '결제 승인에 실패했습니다.');
  return data;
}

const PLAN_PRICE: Record<'basic' | 'pro', Record<'monthly' | 'yearly', number>> = {
  basic: { monthly: 4900, yearly: 49000 },
  pro: { monthly: 9900, yearly: 99000 },
};

function addCycle(cycle: 'monthly' | 'yearly'): string {
  const next = new Date();
  if (cycle === 'yearly') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { paymentKey, orderId, customerKey, plan, billingCycle } = await req.json();
    if (!paymentKey || !orderId || !customerKey || !plan || !billingCycle) {
      return jsonResponse({ error: '잘못된 요청입니다.' }, 400);
    }
    if (!PLAN_PRICE[plan as 'basic' | 'pro']?.[billingCycle as 'monthly' | 'yearly']) {
      return jsonResponse({ error: '알 수 없는 요금제입니다.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY')!;

    // Resolve the caller's own gym from their JWT -- never trust a
    // client-supplied gym_id/customerKey pairing without this check.
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: gym } = await admin
      .from('gyms')
      .select('id, name')
      .eq('owner_id', userData.user.id)
      .single();
    if (!gym) return jsonResponse({ error: '체육관을 찾을 수 없습니다.' }, 404);

    // Idempotency check -- if this orderId was already confirmed (e.g. a
    // duplicate request from a client-side re-render race, or the success
    // redirect getting replayed), don't call Toss's confirm API again: it
    // rejects a reused paymentKey/orderId with ALREADY_PROCESSED_PAYMENT,
    // which would otherwise surface as a false "결제 실패" to a user whose
    // payment already went through.
    const { data: existingPayment } = await admin
      .from('gym_payments')
      .select('id')
      .eq('gym_id', gym.id)
      .eq('order_id', orderId)
      .maybeSingle();
    if (existingPayment) return jsonResponse({ ok: true });

    const { data: sub } = await admin
      .from('gym_subscriptions')
      .select('customer_key')
      .eq('gym_id', gym.id)
      .single();
    if (!sub || sub.customer_key !== customerKey) {
      return jsonResponse({ error: 'customerKey가 일치하지 않습니다.' }, 403);
    }

    // Amount is always computed server-side from PLAN_PRICE, never taken
    // from the client -- Toss's confirm call rejects if it doesn't match
    // what was actually authorized in the widget, so this doubles as
    // tamper protection against a client sending a lower price.
    const amount = PLAN_PRICE[plan as 'basic' | 'pro'][billingCycle as 'monthly' | 'yearly'];
    const confirmed = await confirmOneTimePayment(tossSecretKey, paymentKey, orderId, amount);

    // Toss's response shape for card details isn't consistent between
    // endpoints (billing-auth issue returns it top-level, this confirm
    // endpoint may nest it under `card`) -- check both.
    const cardCompany = confirmed.card?.company ?? confirmed.cardCompany ?? null;
    const cardNumber = confirmed.card?.number ?? confirmed.cardNumber ?? null;

    await admin
      .from('gym_subscriptions')
      .update({
        card_last4: cardNumber ? cardNumber.slice(-4) : null,
        card_company: cardCompany,
        desired_plan: plan,
        billing_cycle: billingCycle,
        status: 'active',
        next_billing_date: addCycle(billingCycle as 'monthly' | 'yearly'),
        failed_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('gym_id', gym.id);

    const { error: paymentInsertError } = await admin.from('gym_payments').insert({
      gym_id: gym.id,
      order_id: orderId,
      plan,
      billing_cycle: billingCycle,
      amount,
      status: 'paid',
      toss_payment_key: confirmed.paymentKey,
    });
    // order_id is unique -- a duplicate here just means this confirm
    // already ran once (e.g. the success redirect got replayed), and the
    // subscription update above is idempotent, so it's safe to ignore.
    if (paymentInsertError && !String(paymentInsertError.message).toLowerCase().includes('duplicate')) {
      throw new Error(paymentInsertError.message);
    }

    await admin.from('gyms').update({ plan }).eq('id', gym.id);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' }, 500);
  }
});
