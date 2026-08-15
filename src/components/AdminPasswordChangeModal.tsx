import React, { useState } from 'react';
import { Key, Lock, X, Check, AlertCircle } from 'lucide-react';

interface AdminPasswordChangeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminPasswordChangeModal: React.FC<AdminPasswordChangeModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPassword = localStorage.getItem('admin_password') || '1234';

    if (currentPassword !== savedPassword) {
      setErrorMsg('현재 비밀번호가 올바르지 않습니다.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('새 비밀번호는 최소 4자리 이상 입력해 주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    localStorage.setItem('admin_password', newPassword);
    setSuccessMsg('비밀번호가 성공적으로 변경되었습니다!');
    setErrorMsg('');

    setTimeout(() => {
      onSuccess();
      onClose();
    }, 1200);
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
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
            <Key className="w-6 h-6" />
          </div>

          <h3 className="text-base font-black text-slate-900 mb-1">
            관리자 비밀번호 변경
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-4">
            학부모 공유 시 관장님 전용 메뉴 보호를 위한 비밀번호 설정
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-3 text-left">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                현재 비밀번호
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="현재 비밀번호 (기본: 1234)"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                새 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="새 비밀번호 입력 (4자리 이상)"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="새 비밀번호 재입력"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>변경하기</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
