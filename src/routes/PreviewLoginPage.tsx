import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trophy, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// One fixed URL (roperank.com/preview?token=...) that logs the visitor
// straight into a pre-seeded demo gym, no signup/login needed -- for
// handing to AI tools / marketing use so they can see the real admin app.
// The token here is just an opaque string; the demo account's actual
// email/password never reach the browser -- the demo-preview Edge
// Function checks the token server-side and hands back a session.
export default function PreviewLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('링크가 올바르지 않아요.');
      return;
    }

    supabase.functions
      .invoke<{ access_token?: string; refresh_token?: string; error?: string }>('demo-preview', {
        body: { token },
      })
      .then(async ({ data, error: invokeError }) => {
        if (invokeError || !data?.access_token || !data?.refresh_token) {
          setError('접속할 수 없어요.');
          return;
        }
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) {
          setError('접속할 수 없어요.');
          return;
        }
        navigate('/admin', { replace: true });
      })
      .catch(() => setError('접속할 수 없어요.'));
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#f4f5f8] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 shadow-lg text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#1B5E20] flex items-center justify-center mb-4 mx-auto">
          <Trophy className="w-7 h-7 text-white" />
        </div>
        {error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <p className="text-sm font-bold text-slate-700">데모 화면으로 이동 중...</p>
        )}
      </div>
    </div>
  );
}
