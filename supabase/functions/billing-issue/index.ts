// Called right after the browser comes back from Toss's hosted billing-auth
// (card registration) widget. Exchanges the one-time authKey for a
// long-lived billingKey (server-side, with the secret key), charges the
// first billing cycle immediately, and activates the subscription. Future
// cycles are charged automatically by billing-charge/index.ts's scheduled
// job using the stored billingKey.
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

interface TossBillingKeyResult {
  billingKey: string;
  card?: { company?: string; number?: string };
}

async function issueBillingKey(
  secretKey: string,
  authKey: string,
  customerKey: string
): Promise<TossBillingKeyResult> {
  const res = await fetch(`${TOSS_API_BASE}/billing/authorizations/issue`, {
    method: 'POST',
    headers: { Authorization: authHeader(secretKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ authKey, customerKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '카드 등록에 실패했습니다.');
  return data;
}

interface TossChargeResult {
  paymentKey: string;
  status: string;
  totalAmount: number;
}

interface ChargeParams {
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
}

async function chargeBillingKey(
  secretKey: string,
  billingKey: string,
  params: ChargeParams
): Promise<TossChargeResult> {
  const res = await fetch(`${TOSS_API_BASE}/billing/${billingKey}`, {
    method: 'POST',
    headers: { Authorization: authHeader(secretKey), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
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
    const { authKey, customerKey, plan, billingCycle } = await req.json();
    if (!authKey || !customerKey || !plan || !billingCycle) {
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

    // The public /preview demo account is a shared login handed out for
    // marketing/showcase use -- real card payments must never go through
    // on it (see demo-preview/index.ts for the account itself).
    if (gym.id === '5156bc7a-8eb8-4dd3-bb5e-ace84c497071') {
      return jsonResponse({ error: '데모 계정에서는 결제를 진행할 수 없습니다.' }, 403);
    }

    const { data: sub } = await admin
      .from('gym_subscriptions')
      .select('customer_key')
      .eq('gym_id', gym.id)
      .single();
    if (!sub || sub.customer_key !== customerKey) {
      return jsonResponse({ error: 'customerKey가 일치하지 않습니다.' }, 403);
    }

    // authKey is single-use on Toss's side -- a duplicate request (e.g. a
    // client-side re-render race, or the success redirect getting
    // replayed) fails naturally here with Toss's own "already used" error
    // instead of double-charging, so no separate idempotency table is
    // needed the way the old one-time-payment flow needed one.
    const issued = await issueBillingKey(tossSecretKey, authKey, customerKey);

    // Amount is always computed server-side from PLAN_PRICE, never taken
    // from the client -- doubles as tamper protection against a client
    // sending a lower price.
    const amount = PLAN_PRICE[plan as 'basic' | 'pro'][billingCycle as 'monthly' | 'yearly'];
    const orderId = `${gym.id}-${Date.now()}`;
    const orderName = `줄넘기 랭킹보드 ${(plan as string).toUpperCase()} 플랜 (${billingCycle === 'yearly' ? '연간' : '월간'})`;
    const charged = await chargeBillingKey(tossSecretKey, issued.billingKey, {
      customerKey,
      orderId,
      orderName,
      amount,
    });

    const cardCompany = issued.card?.company ?? null;
    const cardNumber = issued.card?.number ?? null;

    await admin
      .from('gym_subscriptions')
      .update({
        billing_key: issued.billingKey,
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
      toss_payment_key: charged.paymentKey,
    });
    if (paymentInsertError) throw new Error(paymentInsertError.message);

    await admin.from('gyms').update({ plan }).eq('id', gym.id);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' }, 500);
  }
});
