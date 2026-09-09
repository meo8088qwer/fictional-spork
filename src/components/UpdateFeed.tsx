import React, { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { CHANGELOG } from '../data/changelog';

const VISIBLE_LIMIT = 5;
const NEW_BADGE_DAYS = 7;

function isRecent(dateStr: string): boolean {
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  return days <= NEW_BADGE_DAYS;
}

export const UpdateFeed: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? CHANGELOG : CHANGELOG.slice(0, VISIBLE_LIMIT);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm mt-4">
      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-slate-400" />
        업데이트 소식
      </h3>
      <div className="space-y-1.5">
        {visible.map((entry) => {
          const isOpen = expandedId === entry.id;
          return (
            <div key={entry.id} className="rounded-xl border border-slate-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : entry.id)}
                className="w-full flex items-start gap-2 px-2.5 py-2 text-left hover:bg-slate-50 cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate">{entry.title}</span>
                    {isRecent(entry.date) && (
                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-2">{entry.summary}</p>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-2.5 pb-3 pt-1 border-t border-slate-100 bg-slate-50/60">
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed mb-2">{entry.detail}</p>
                  <p className="text-[11px] text-[#1B5E20] font-bold leading-relaxed">사용법: {entry.howTo}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-2">{entry.date}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!showAll && CHANGELOG.length > VISIBLE_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 w-full text-xs font-bold text-[#1B5E20] hover:underline text-center cursor-pointer"
        >
          지난 업데이트 더 보기 ({CHANGELOG.length - VISIBLE_LIMIT}개 더) →
        </button>
      )}
    </div>
  );
};
