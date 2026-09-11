// Lets the site owner share one fixed URL (roperank.com/preview?token=...)
// that logs a visitor straight into a pre-seeded demo gym, no signup/login
// needed -- built for handing to AI tools / marketing use so they can see
// the real admin app instead of just the landing page.
//
// Requires these Supabase project secrets (not in this repo):
// PREVIEW_TOKEN, DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD -- set via
// `supabase secrets set` and redeploy this function from this exact source.
// Rotate PREVIEW_TOKEN (set a new value + redeploy) to revoke the shared
// URL instantly, without touching the demo account itself.
//
// Self-contained (no ../_shared imports), matching this repo's other
// Edge Functions.

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const previewToken = Deno.env.get('PREVIEW_TOKEN');
  const demoEmail = Deno.env.get('DEMO_ACCOUNT_EMAIL');
  const demoPassword = Deno.env.get('DEMO_ACCOUNT_PASSWORD');
  if (!previewToken || !demoEmail || !demoPassword) {
    return jsonResponse({ error: 'not configured' }, 500);
  }

  const body = await req.json().catch(() => ({}));
  const token = body?.token;

  if (!token || token !== previewToken) {
    return jsonResponse({ error: 'invalid token' }, 401);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });

  if (error || !data.session) {
    return jsonResponse({ error: 'sign-in failed' }, 500);
  }

  return jsonResponse({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});
