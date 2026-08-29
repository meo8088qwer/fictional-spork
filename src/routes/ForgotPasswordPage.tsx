import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await sendPasswordReset(email);
      // Always show the same success message regardless of whether the
      // email actually exists -- confirming/denying an account's existence
      // here would let anyone enumerate registered gym owner emails.
      setSent(true);
    } catch (err: any) {
      setError(err?.message || '요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 shadow-lg">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1B5E20] flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">비밀번호 찾기</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            가입하신 이메일로 비밀번호 재설정 링크를 보내드려요.
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
              입력하신 이메일이 가입된 계정이라면, 비밀번호 재설정 링크가 곧 도착해요. 메일함(스팸함 포함)을
              확인해 주세요.
            </p>
            <Link
              to="/login"
              className="block w-full py-3 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-sm transition-all"
            >
              로그인하러 가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="가입한 이메일"
                required
                autoFocus
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-60 text-white font-bold text-sm transition-all"
            >
              {isSubmitting ? '전송 중...' : '재설정 링크 보내기'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-500 font-medium mt-5">
          <Link to="/login" className="text-[#1B5E20] font-bold hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
