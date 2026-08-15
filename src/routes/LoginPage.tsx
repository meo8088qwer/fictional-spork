import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      navigate('/admin');
    } catch (err: any) {
      setError('이메일 또는 비밀번호가 일치하지 않습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 shadow-lg">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">관장님 로그인</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            줄넘기 실시간 랭킹보드 관리자 화면으로 이동합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              required
              autoFocus
              className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-all"
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
            className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm transition-all"
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 font-medium mt-5">
          아직 계정이 없으신가요?{' '}
          <Link to="/signup" className="text-slate-900 font-bold hover:underline">
            무료로 시작하기
          </Link>
        </p>
      </div>
    </div>
  );
}
