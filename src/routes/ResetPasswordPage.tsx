import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Reached via the link in the password-reset email
// (redirectTo: `${origin}/reset-password` in sendPasswordReset). Supabase's
// client auto-detects the recovery token in the URL and establishes a
// temporary session before this page ever renders, so submitting here just
// calls the normal updateUser -- no token handling needed in this component.
export default function ResetPasswordPage() {
  const { updatePassword, signOut } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsSubmitting(true);
    try {
      await updatePassword(password);
      navigate('/admin');
    } catch (err: any) {
      setError(
        err?.message ||
          '비밀번호 변경에 실패했습니다. 재설정 링크가 만료됐을 수 있어요, 다시 요청해 주세요.'
      );
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
          <h1 className="text-lg font-bold text-slate-900">새 비밀번호 설정</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">사용하실 새 비밀번호를 입력해 주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="새 비밀번호 (6자 이상)"
              required
              autoFocus
              className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 확인"
              required
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
            {isSubmitting ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            signOut();
            navigate('/login');
          }}
          className="block w-full text-center text-xs text-slate-400 font-medium mt-5 hover:text-slate-600 cursor-pointer"
        >
          취소하고 로그인 화면으로
        </button>
      </div>
    </div>
  );
}
