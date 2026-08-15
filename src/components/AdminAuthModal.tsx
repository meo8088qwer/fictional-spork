import React, { useState } from 'react';
import { Lock, KeyRound, X, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPassword = localStorage.getItem('admin_password') || '1234';

    if (passwordInput === savedPassword) {
      setErrorMsg('');
      setPasswordInput('');
      onSuccess();
    } else {
      setErrorMsg('비밀번호가 일치하지 않습니다. (초기 비밀번호: 1234)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-black text-slate-900 mb-1">
            관장님(관리자) 인증
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mb-5">
            수련생 일괄등록 및 기록 수정/삭제는 관장님 전용 메뉴입니다. 비밀번호를 입력해주세요.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="관리자 비밀번호 (초기: 1234)"
                autoFocus
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-[11px] text-amber-800 text-left">
              💡 <strong>안내:</strong> 초기 비밀번호는 <code className="bg-amber-100 px-1 py-0.5 rounded font-bold text-amber-900">1234</code>입니다. 인증 후 비밀번호를 변경하실 수 있습니다.
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
              >
                취소 (학부모 모드)
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>관리자 로그인</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
