import React, { useState } from 'react';
import { Mail, Lock, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Gym } from '../data/api/gyms';

interface MyPageProps {
  email: string | undefined;
  gym: Gym;
  onSaveName: (name: string) => Promise<void>;
  onSaveSlug: (slug: string) => Promise<void>;
  onSavePassword: (newPassword: string) => Promise<void>;
}

function sanitizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '');
}

export const MyPage: React.FC<MyPageProps> = ({ email, gym, onSaveName, onSaveSlug, onSavePassword }) => {
  const [name, setName] = useState(gym.name);
  const [slug, setSlug] = useState(gym.slug);
  const [isSavingGym, setIsSavingGym] = useState(false);
  const [gymError, setGymError] = useState('');
  const [gymSuccess, setGymSuccess] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleGymSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().replace(/-+$/, '');
    setGymSuccess('');
    if (!trimmedName) {
      setGymError('체육관 이름을 입력해 주세요.');
      return;
    }
    if (trimmedSlug.length < 3) {
      setGymError('공개 링크 주소는 최소 3자 이상이어야 해요.');
      return;
    }
    setIsSavingGym(true);
    setGymError('');
    try {
      if (trimmedName !== gym.name) await onSaveName(trimmedName);
      if (trimmedSlug !== gym.slug) await onSaveSlug(trimmedSlug);
      setGymSuccess('저장됐어요.');
    } catch (err) {
      setGymError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingGym(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    if (newPassword.length < 6) {
      setPasswordError('비밀번호는 최소 6자 이상이어야 해요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않아요.');
      return;
    }
    setIsSavingPassword(true);
    setPasswordError('');
    try {
      await onSavePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('비밀번호가 변경됐어요.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : '변경 중 오류가 발생했습니다.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-900 mb-6">마이페이지</h1>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-slate-400" />
          계정 정보
        </h2>
        <label className="text-xs font-bold text-slate-500 pl-1">아이디 (이메일)</label>
        <div className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-bold">
          {email}
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-slate-400" />
          비밀번호 변경
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 pl-1">새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="6자 이상"
              className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 pl-1">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="한 번 더 입력"
              className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
            />
          </div>

          {passwordError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingPassword}
            className="w-full py-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-60 text-white font-bold text-xs transition-all cursor-pointer"
          >
            {isSavingPassword ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-slate-400" />
          체육관 설정
        </h2>
        <form onSubmit={handleGymSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 pl-1">체육관 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setGymError('');
              }}
              placeholder="체육관 이름"
              className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 pl-1">공개 링크 주소</label>
            <div className="mt-1.5 flex items-center rounded-xl bg-slate-50 border border-slate-300 focus-within:ring-2 focus-within:ring-[#66BB6A] focus-within:bg-white transition-all overflow-hidden">
              <span className="pl-4 py-3 text-xs font-medium text-slate-400 whitespace-nowrap">
                roperank.com/g/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(sanitizeSlugInput(e.target.value));
                  setGymError('');
                }}
                placeholder="my-gym"
                className="min-w-0 flex-1 pr-4 py-3 bg-transparent text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium pl-1 mt-1">
              영문 소문자, 숫자, 하이픈(-)만 사용할 수 있어요.
            </p>
          </div>

          {gymError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gymError}</span>
            </div>
          )}
          {gymSuccess && (
            <div className="bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{gymSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingGym}
            className="w-full py-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-60 text-white font-bold text-xs transition-all cursor-pointer"
          >
            {isSavingGym ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>
    </div>
  );
};
