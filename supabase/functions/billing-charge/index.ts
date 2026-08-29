// Scheduled job (run daily via Supabase Cron) that charges every
// subscription due for renewal today. Has no user auth context since
// nothing initiates it, so it's gated by CRON_SECRET instead of a user JWT.
//
// Self-contained (no ../_shared imports) so it can be pasted directly into
// Supabase's browser-based Edge Function editor as a single file.
//
// ponytail: no lock against two overlapping runs double-charging the same
// gym on the same day. Low risk with a single daily schedule; if that ever
// becomes a real problem, add a `select ... for update skip locked`.

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
  customerName?: string;
  customerEmail?: string;
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
  if (!res.ok) throw new Error(data.message || '결제에 실패했습니다.');
  return data;
}

const PLAN_PRICE: Record<'basic' | 'pro', Record<'monthly' | 'yearly', number>> = {
  basic: { monthly: 4900, yearly: 49000 },
  pro: { monthly: 9900, yearly: 99000 },
};

const MAX_FAILED_ATTEMPTS = 3;

function addCycle(cycle: 'monthly' | 'yearly'): string {
  const next = new Date();
  if (cycle === 'yearly') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const today = new Date().toISOString().slice(0, 10);
  const { data: due, error } = await admin
    .from('gym_subscriptions')
    .select('gym_id, customer_key, billing_key, desired_plan, billing_cycle, failed_attempts')
    .eq('status', 'active')
    .lte('next_billing_date', today)
    .not('billing_key', 'is', null);

  if (error) return jsonResponse({ error: error.message }, 500);

  const results: Array<{ gym_id: string; ok: boolean; error?: string }> = [];

  for (const sub of due ?? []) {
    const plan = sub.desired_plan as 'basic' | 'pro';
    const cycle = sub.billing_cycle as 'monthly' | 'yearly';
    const amount = PLAN_PRICE[plan]?.[cycle];
    const orderId = `${sub.gym_id}-${today}`;

    if (!amount || !sub.billing_key) {
      results.push({ gym_id: sub.gym_id, ok: false, error: 'missing amount/billing_key' });
      continue;
    }

    try {
      const charge = await chargeBillingKey(tossSecretKey, sub.billing_key, {
        customerKey: sub.customer_key,
        orderId,
        orderName: `줄넘기 랭킹보드 ${plan.toUpperCase()} 플랜 갱신`,
        amount,
      });

      await admin
        .from('gym_subscriptions')
        .update({
          status: 'active',
          next_billing_date: addCycle(cycle),
          failed_attempts: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('gym_id', sub.gym_id);

      await admin.from('gym_payments').insert({
        gym_id: sub.gym_id,
        order_id: orderId,
        plan,
        billing_cycle: cycle,
        amount,
        status: 'paid',
        toss_payment_key: charge.paymentKey,
      });

      await admin.from('gyms').update({ plan }).eq('id', sub.gym_id);
      results.push({ gym_id: sub.gym_id, ok: true });
    } catch (err) {
      const failureReason = err instanceof Error ? err.message : String(err);
      const failedAttempts = (sub.failed_attempts ?? 0) + 1;
      const downgrade = failedAttempts >= MAX_FAILED_ATTEMPTS;

      await admin
        .from('gym_subscriptions')
        .update({
          status: downgrade ? 'past_due' : 'active',
          failed_attempts: failedAttempts,
          updated_at: new Date().toISOString(),
        })
        .eq('gym_id', sub.gym_id);

      await admin.from('gym_payments').insert({
        gym_id: sub.gym_id,
        order_id: `${orderId}-fail-${failedAttempts}`,
        plan,
        billing_cycle: cycle,
        amount,
        status: 'failed',
        failure_reason: failureReason,
      });

      if (downgrade) {
        await admin.from('gyms').update({ plan: 'free' }).eq('id', sub.gym_id);
      }

      results.push({ gym_id: sub.gym_id, ok: false, error: failureReason });
    }
  }

  // Interim manual-renewal path (see billing-issue/index.ts's doc comment):
  // subscriptions with no billing_key are never picked up by the
  // auto-charge query above, so if their paid period lapses without the
  // gym owner manually paying again, mark it past_due -- then, after a
  // grace period, actually downgrade the plan back to free.
  const GRACE_DAYS = 3;
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - GRACE_DAYS);
  const graceCutoffStr = graceCutoff.toISOString().slice(0, 10);

  const { data: pastDue } = await admin
    .from('gym_subscriptions')
    .select('gym_id')
    .eq('status', 'active')
    .is('billing_key', null)
    .lte('next_billing_date', today);

  for (const sub of pastDue ?? []) {
    await admin
      .from('gym_subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('gym_id', sub.gym_id);
    results.push({ gym_id: sub.gym_id, ok: true, error: `past_due, ${GRACE_DAYS}-day grace period started` });
  }

  const { data: graceExpired } = await admin
    .from('gym_subscriptions')
    .select('gym_id')
    .eq('status', 'past_due')
    .is('billing_key', null)
    .lte('next_billing_date', graceCutoffStr);

  for (const sub of graceExpired ?? []) {
    await admin.from('gyms').update({ plan: 'free' }).eq('id', sub.gym_id);
    results.push({ gym_id: sub.gym_id, ok: true, error: 'grace period over, downgraded to free' });
  }

  return jsonResponse({ processed: results.length, results });
});
