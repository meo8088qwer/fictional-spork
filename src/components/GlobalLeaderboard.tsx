import React, { useState } from 'react';
import { Trophy, Lock } from 'lucide-react';
import { DEFAULT_EVENTS } from '../data/constants';
import { useGlobalLeaderboard } from '../hooks/useGymData';
import { Gym } from '../data/api/gyms';
import { EventKey } from '../types';

interface GlobalLeaderboardProps {
  gym: Gym;
  onNavigateToPricing: () => void;
}

export const GlobalLeaderboard: React.FC<GlobalLeaderboardProps> = ({ gym, onNavigateToPricing }) => {
  const [activeEvent, setActiveEvent] = useState<EventKey>('30s_basic');
  const { entries, isLoading } = useGlobalLeaderboard();

  const ranked = entries
    .filter((e) => e.eventKey === activeEvent)
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">전체랭킹</h1>
      <p className="text-xs text-slate-500 font-medium mb-4">
        모든 체육관의 수련생을 대상으로 한 종목별 랭킹이에요.
      </p>

      {gym.plan === 'free' && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <Lock className="w-4 h-4 shrink-0" />
            FREE 플랜은 전체랭킹을 볼 수만 있어요. BASIC부터 우리 체육관 수련생이 참가할 수 있습니다.
          </span>
          <button
            type="button"
            onClick={onNavigateToPricing}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            요금제 보기
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.values(DEFAULT_EVENTS).map((meta) => (
          <button
            key={meta.key}
            type="button"
            onClick={() => setActiveEvent(meta.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeEvent === meta.key
                ? 'bg-[#1B5E20] text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {meta.title}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium">불러오는 중...</div>
        ) : ranked.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium">
            아직 이 종목에 등록된 기록이 없어요.
          </div>
        ) : (
          ranked.map((entry, i) => (
            <div
              key={`${entry.gymName}-${entry.studentName}-${i}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0"
            >
              <span
                className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-[#1B5E20] text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i === 0 ? <Trophy className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">{entry.studentName}</div>
                <div className="text-[11px] text-slate-400 font-medium truncate">
                  {entry.gymName} · {entry.grade}
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900 shrink-0">{entry.count}회</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
