import React, { useState } from 'react';
import { X, Building2, AlertCircle } from 'lucide-react';

interface GymNameModalProps {
  isOpen: boolean;
  currentName: string;
  currentSlug: string;
  onSaveName: (name: string) => Promise<void>;
  onSaveSlug: (slug: string) => Promise<void>;
  onClose: () => void;
}

function sanitizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '');
}

export const GymNameModal: React.FC<GymNameModalProps> = ({
  isOpen,
  currentName,
  currentSlug,
  onSaveName,
  onSaveSlug,
  onClose,
}) => {
  const [name, setName] = useState(currentName);
  const [slug, setSlug] = useState(currentSlug);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().replace(/-+$/, '');
    if (!trimmedName) {
      setError('체육관 이름을 입력해 주세요.');
      return;
    }
    if (trimmedSlug.length < 3) {
      setError('공개 링크 주소는 최소 3자 이상이어야 해요.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      if (trimmedName !== currentName) {
        await onSaveName(trimmedName);
      }
      if (trimmedSlug !== currentSlug) {
        await onSaveSlug(trimmedSlug);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs grid place-items-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">체육관 설정</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mb-5">
            랭킹보드와 공개 페이지에 표시되는 정보예요.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="text-left space-y-1.5">
              <label className="text-xs font-bold text-slate-500 pl-1">체육관 이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="체육관 이름"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
              />
            </div>

            <div className="text-left space-y-1.5">
              <label className="text-xs font-bold text-slate-500 pl-1">공개 링크 주소</label>
              <div className="flex items-center rounded-xl bg-slate-50 border border-slate-300 focus-within:ring-2 focus-within:ring-[#66BB6A] focus-within:bg-white transition-all overflow-hidden">
                <span className="pl-4 py-3 text-xs font-medium text-slate-400 whitespace-nowrap">
                  roperank.com/g/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(sanitizeSlugInput(e.target.value));
                    setError('');
                  }}
                  placeholder="my-gym"
                  className="min-w-0 flex-1 pr-4 py-3 bg-transparent text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium pl-1">
                영문 소문자, 숫자, 하이픈(-)만 사용할 수 있어요.
              </p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-60 text-white font-bold text-xs transition-all cursor-pointer"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
