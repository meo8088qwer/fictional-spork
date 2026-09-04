// Verifies the code sent by send-referral-otp/index.ts, then grants every
// referral milestone reward unlocked since the caller's last claim.
//
// Milestone table (cumulative total referrals, not "N in one batch" --
// see 0023_referral_v2.sql's doc comment): 1 -> BASIC 1개월, 5 -> PRO
// 1개월, 10 -> PRO 2개월, then +1 PRO month every 3 more (13, 16, 19...).
// Capped at a 24-month lifetime total across all referral rewards.
//
// Anti-Sybil: a phone number can only ever be verified for ONE gym for
// life (referral_verified_phones has phone as its primary key) -- this is
// what actually defeats "make many Google accounts," since each fake gym
// still needs a distinct real phone to claim anything.
//
// Self-contained (no ../_shared imports), matching billing-issue/index.ts's
// convention.

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

function normalizePhone(input: string): string | null {
  const digits = String(input).replace(/\D/g, '');
  return /^01[016789]\d{7,8}$/.test(digits) ? digits : null;
}

const LIFETIME_CAP_MONTHS = 24;
const MAX_OTP_ATTEMPTS = 5;

function milestoneReward(count: number): { plan: 'basic' | 'pro'; months: number } | null {
  if (count === 1) return { plan: 'basic', months: 1 };
  if (count === 5) return { plan: 'pro', months: 1 };
  if (count === 10) return { plan: 'pro', months: 2 };
  if (count > 10 && (count - 10) % 3 === 0) return { plan: 'pro', months: 1 };
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, code } = await req.json();
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    if (!normalizedPhone || !code) return jsonResponse({ error: '잘못된 요청입니다.' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: gym } = await admin
      .from('gyms')
      .select('id, referral_success_count, referral_reward_claimed_count, referral_reward_months_used, referral_verified_phone')
      .eq('owner_id', userData.user.id)
      .single();
    if (!gym) return jsonResponse({ error: '체육관을 찾을 수 없습니다.' }, 404);

    const { data: otp } = await admin
      .from('phone_otps')
      .select('id, code, expires_at, consumed_at, attempt_count')
      .eq('gym_id', gym.id)
      .eq('phone', normalizedPhone)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) return jsonResponse({ error: '인증번호를 다시 요청해 주세요.' }, 400);
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return jsonResponse({ error: '인증번호가 만료됐어요. 다시 요청해 주세요.' }, 400);
    }
    if (otp.attempt_count >= MAX_OTP_ATTEMPTS) {
      return jsonResponse({ error: '인증 시도 횟수를 초과했어요. 다시 요청해 주세요.' }, 400);
    }
    if (otp.code !== String(code).trim()) {
      await admin.from('phone_otps').update({ attempt_count: otp.attempt_count + 1 }).eq('id', otp.id);
      return jsonResponse({ error: '인증번호가 일치하지 않아요.' }, 400);
    }

    await admin.from('phone_otps').update({ consumed_at: new Date().toISOString() }).eq('id', otp.id);

    // Global uniqueness -- one real phone can only ever be tied to one
    // gym's referral-claim identity.
    const { data: existingClaim } = await admin
      .from('referral_verified_phones')
      .select('gym_id')
      .eq('phone', normalizedPhone)
      .maybeSingle();
    if (existingClaim && existingClaim.gym_id !== gym.id) {
      return jsonResponse({ error: '이미 다른 계정에서 인증된 번호예요.' }, 409);
    }
    if (!existingClaim) {
      await admin.from('referral_verified_phones').insert({ phone: normalizedPhone, gym_id: gym.id });
    }
    if (gym.referral_verified_phone !== normalizedPhone) {
      await admin.from('gyms').update({ referral_verified_phone: normalizedPhone }).eq('id', gym.id);
    }

    // Grant every milestone unlocked since the last claim, one month at a
    // time via grant_referral_reward_month (0024_referral_grant_helper.sql)
    // so the lifetime cap can stop mid-milestone instead of all-or-nothing.
    let monthsUsed: number = gym.referral_reward_months_used;
    let claimed: number = gym.referral_reward_claimed_count;
    const granted: { plan: string; months: number }[] = [];

    for (let count = claimed + 1; count <= gym.referral_success_count; count++) {
      claimed = count;
      const reward = milestoneReward(count);
      if (!reward) continue;

      const monthsToGrant = Math.min(reward.months, Math.max(LIFETIME_CAP_MONTHS - monthsUsed, 0));
      for (let i = 0; i < monthsToGrant; i++) {
        const { error: grantError } = await admin.rpc('grant_referral_reward_month', {
          p_gym_id: gym.id,
          p_plan: reward.plan,
        });
        if (grantError) throw new Error(grantError.message);
      }
      if (monthsToGrant > 0) {
        monthsUsed += monthsToGrant;
        granted.push({ plan: reward.plan, months: monthsToGrant });
      }
    }

    await admin
      .from('gyms')
      .update({ referral_reward_claimed_count: claimed, referral_reward_months_used: monthsUsed })
      .eq('id', gym.id);

    return jsonResponse({ ok: true, granted, monthsUsed });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' }, 500);
  }
});
