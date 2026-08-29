import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Mail, Lock, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [gymName, setGymName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!gymName.trim()) {
      setError('체육관 이름을 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (!agreed) {
      setError('이용약관 및 개인정보처리방침에 동의해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { needsEmailConfirmation: needsConfirm } = await signUp(email, password, gymName.trim());
      if (needsConfirm) {
        setNeedsEmailConfirmation(true);
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err?.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (needsEmailConfirmation) {
    return (
      <div className="min-h-screen bg-[#f4f5f8] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 shadow-lg text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">가입 확인 이메일을 보냈어요</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
            {email}로 전송된 확인 링크를 클릭하시면 가입이 완료됩니다. 확인 후 로그인해 주세요.
          </p>
          <Link
            to="/login"
            className="block w-full py-3 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-sm transition-all"
          >
            로그인하러 가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f8] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 shadow-lg">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1B5E20] flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">체육관 계정 만들기</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            무료 플랜(기본 종목 6개 · 학생 50명)으로 바로 시작하세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="체육관 이름 (예: 파워점핑줄넘기)"
              className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              required
              className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              required
              className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-500 font-medium cursor-pointer pl-0.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-[#1B5E20] cursor-pointer"
            />
            <span>
              <Link to="/terms" target="_blank" className="font-bold text-slate-700 hover:underline">
                이용약관
              </Link>{' '}
              및{' '}
              <Link to="/privacy" target="_blank" className="font-bold text-slate-700 hover:underline">
                개인정보처리방침
              </Link>
              에 동의합니다. (필수)
            </span>
          </label>

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
            {isSubmitting ? '가입 처리 중...' : '무료로 시작하기'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 font-medium mt-5">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-[#1B5E20] font-bold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
