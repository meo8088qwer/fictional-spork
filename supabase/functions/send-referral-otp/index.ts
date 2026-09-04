// Sends a 6-digit SMS verification code for the referral-reward claim flow
// ONLY -- signup/login never requires phone verification (explicit product
// decision: friction is only acceptable at the point of claiming a reward,
// not at signup). Paired with verify-referral-otp/index.ts. See
// supabase/migrations/0023_referral_v2.sql.
//
// Requires these Supabase project secrets (not in this repo):
// SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_PHONE (a 발신번호
// pre-registered with Solapi).
//
// Self-contained (no ../_shared imports) so it can be pasted directly into
// Supabase's browser-based Edge Function editor as a single file, matching
// billing-issue/index.ts's convention.

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

// Korean mobile numbers only (010/011/016/017/018/019 + 7-8 digits).
// Returns a plain-digit string (no hyphens) or null if invalid.
function normalizePhone(input: string): string | null {
  const digits = String(input).replace(/\D/g, '');
  return /^01[016789]\d{7,8}$/.test(digits) ? digits : null;
}

function randomOtpCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return hex(sig);
}

// Solapi's HMAC-signature auth scheme (https://docs.solapi.com) -- avoids
// putting the raw API secret in a header on every request.
async function sendSolapiSms(apiKey: string, apiSecret: string, from: string, to: string, text: string): Promise<void> {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID();
  const signature = await hmacSha256Hex(apiSecret, date + salt);
  const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { to, from, text } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errorMessage || data.message || 'SMS 발송에 실패했습니다.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    if (!normalizedPhone) return jsonResponse({ error: '휴대폰 번호 형식이 올바르지 않아요.' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const solapiApiKey = Deno.env.get('SOLAPI_API_KEY')!;
    const solapiApiSecret = Deno.env.get('SOLAPI_API_SECRET')!;
    const solapiSenderPhone = Deno.env.get('SOLAPI_SENDER_PHONE')!;

    // Resolve the caller's own gym from their JWT -- never trust a
    // client-supplied gym_id.
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: '로그인이 필요합니다.' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: gym } = await admin.from('gyms').select('id').eq('owner_id', userData.user.id).single();
    if (!gym) return jsonResponse({ error: '체육관을 찾을 수 없습니다.' }, 404);

    // Basic resend cooldown -- refuses a new send within 60s of the last
    // one for this gym+phone pair.
    const { data: recent } = await admin
      .from('phone_otps')
      .select('created_at')
      .eq('gym_id', gym.id)
      .eq('phone', normalizedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
      return jsonResponse({ error: '잠시 후 다시 시도해 주세요.' }, 429);
    }

    const code = randomOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

    const { error: insertError } = await admin.from('phone_otps').insert({
      gym_id: gym.id,
      phone: normalizedPhone,
      code,
      expires_at: expiresAt,
    });
    if (insertError) throw new Error(insertError.message);

    await sendSolapiSms(
      solapiApiKey,
      solapiApiSecret,
      solapiSenderPhone,
      normalizedPhone,
      `[ROPERANK] 인증번호는 ${code}입니다. 5분 이내에 입력해 주세요.`
    );

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' }, 500);
  }
});
