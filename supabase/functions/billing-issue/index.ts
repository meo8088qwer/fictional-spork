// Called right after the browser comes back from Toss's hosted
// card-registration page. Exchanges authKey for a billingKey (server-side,
// with the secret key), charges the first billing cycle immediately, and
// activates the subscription. See supabase/functions/_shared/toss.ts.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { issueBillingKey, chargeBillingKey, PLAN_PRICE } from '../_shared/toss.ts';

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

    const { data: sub } = await admin
      .from('gym_subscriptions')
      .select('customer_key')
      .eq('gym_id', gym.id)
      .single();
    if (!sub || sub.customer_key !== customerKey) {
      return jsonResponse({ error: 'customerKey가 일치하지 않습니다.' }, 403);
    }

    const auth = await issueBillingKey(tossSecretKey, authKey, customerKey);
    const amount = PLAN_PRICE[plan as 'basic' | 'pro'][billingCycle as 'monthly' | 'yearly'];
    const orderId = `${gym.id}-${Date.now()}`;

    const charge = await chargeBillingKey(tossSecretKey, auth.billingKey, {
      customerKey,
      orderId,
      orderName: `줄넘기 랭킹보드 ${String(plan).toUpperCase()} 플랜 (${billingCycle === 'yearly' ? '연간' : '월간'})`,
      amount,
      customerName: gym.name,
    });

    await admin
      .from('gym_subscriptions')
      .update({
        billing_key: auth.billingKey,
        card_last4: auth.card?.number?.slice(-4) ?? null,
        card_company: auth.card?.company ?? auth.card?.issuerCode ?? null,
        desired_plan: plan,
        billing_cycle: billingCycle,
        status: 'active',
        next_billing_date: addCycle(billingCycle as 'monthly' | 'yearly'),
        failed_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('gym_id', gym.id);

    await admin.from('gym_payments').insert({
      gym_id: gym.id,
      order_id: orderId,
      plan,
      billing_cycle: billingCycle,
      amount,
      status: 'paid',
      toss_payment_key: charge.paymentKey,
    });

    await admin.from('gyms').update({ plan }).eq('id', gym.id);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' }, 500);
  }
});
