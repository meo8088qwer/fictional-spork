import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { PlanLimitCode, planLimitMessage } from '../data/api/errors';

interface UpgradeModalProps {
  code: PlanLimitCode | null;
  onUpgrade: () => void;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ code, onUpgrade, onClose }) => {
  if (!code) return null;

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
          <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-1.5">무료 플랜 한도에 도달했어요</h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6">
            {planLimitMessage(code)}
          </p>

          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              나중에
            </button>
            <button
              type="button"
              onClick={onUpgrade}
              className="flex-1 py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 font-bold text-xs text-white transition-all cursor-pointer"
            >
              요금제 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
