import React from 'react';
import { AlertTriangle, Trash2, RotateCcw, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = '삭제하기',
  cancelText = '취소',
  variant = 'danger',
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

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
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              variant === 'danger'
                ? 'bg-rose-100 text-rose-600'
                : variant === 'warning'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-indigo-100 text-indigo-600'
            }`}
          >
            {variant === 'danger' ? (
              <Trash2 className="w-6 h-6" />
            ) : variant === 'warning' ? (
              <RotateCcw className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <h3 className="text-base font-extrabold text-slate-900 mb-1.5">{title}</h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6 whitespace-pre-line">
            {message}
          </p>

          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-md transition-all cursor-pointer ${
                variant === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : variant === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
