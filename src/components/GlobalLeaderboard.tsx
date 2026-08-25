import React, { useState } from 'react';
import { Lock, Crown } from 'lucide-react';
import { DEFAULT_EVENTS } from '../data/constants';
import { useGlobalLeaderboard } from '../hooks/useGymData';
import { GlobalLeaderboardEntry } from '../data/api/globalLeaderboard';
import { Gym } from '../data/api/gyms';
import { EventKey } from '../types';

interface GlobalLeaderboardProps {
  gym: Gym;
  onNavigateToPricing: () => void;
}

const MEDALS = [
  { badge: 'from-amber-300 to-amber-500', ring: 'border-amber-400', glow: 'shadow-amber-300/60', label: '1위' },
  { badge: 'from-slate-300 to-slate-400', ring: 'border-slate-300', glow: 'shadow-slate-300/50', label: '2위' },
  { badge: 'from-orange-300 to-orange-500', ring: 'border-orange-400', glow: 'shadow-orange-300/50', label: '3위' },
];

function TiltCard({ children, className, delayMs }: { children: React.ReactNode; className: string; delayMs: number }) {
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.transform = `perspective(800px) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg) scale3d(1.04,1.04,1.04)`;
  };
  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  };

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transition: 'transform 200ms ease-out', animationDelay: `${delayMs}ms` }}
      className={`animate-pop-in ${className}`}
    >
      {children}
    </div>
  );
}

function PodiumCard({ entry, rank }: { entry: GlobalLeaderboardEntry; rank: 1 | 2 | 3 }) {
  const medal = MEDALS[rank - 1];
  const isFirst = rank === 1;

  return (
    <TiltCard
      delayMs={[150, 0, 300][rank - 1]}
      className={`relative rounded-2xl bg-white border-2 ${medal.ring} shadow-xl ${medal.glow} p-5 text-center ${
        isFirst ? 'sm:-translate-y-4' : ''
      }`}
    >
      {isFirst && (
        <Crown className="w-6 h-6 text-amber-500 mx-auto mb-1 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]" />
      )}
      <div
        className={`mx-auto mb-2 w-12 h-12 rounded-full bg-gradient-to-br ${medal.badge} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
      >
        {rank}
      </div>
      <div className="text-sm font-bold text-slate-900 truncate">{entry.studentName}</div>
      <div className="text-[11px] text-slate-400 font-medium truncate mb-2">
        {entry.gymName} · {entry.grade}
      </div>
      <div className="text-xl font-bold text-slate-900">{entry.count}<span className="text-xs font-bold text-slate-400 ml-0.5">회</span></div>
    </TiltCard>
  );
}

export const GlobalLeaderboard: React.FC<GlobalLeaderboardProps> = ({ gym, onNavigateToPricing }) => {
  const [activeEvent, setActiveEvent] = useState<EventKey>('30s_basic');
  const { entries, isLoading } = useGlobalLeaderboard();

  const top20 = entries
    .filter((e) => e.eventKey === activeEvent)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  const top3 = top20.slice(0, 3);
  const rest = top20.slice(3);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">전체랭킹</h1>
      <p className="text-xs text-slate-500 font-medium mb-4">
        모든 체육관의 수련생을 대상으로 한 종목별 TOP 20이에요.
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

      <div className="flex flex-wrap gap-1.5 mb-6">
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

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400 font-medium bg-white border border-slate-200 rounded-xl">
          불러오는 중...
        </div>
      ) : top20.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 font-medium bg-white border border-slate-200 rounded-xl">
          아직 이 종목에 등록된 기록이 없어요.
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div
              key={activeEvent}
              style={{ perspective: '1000px' }}
              className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 items-end"
            >
              {[top3[1], top3[0], top3[2]].map((entry, i) =>
                entry ? <PodiumCard key={entry.studentName + entry.gymName} entry={entry} rank={([2, 1, 3] as const)[i]} /> : <div key={i} />
              )}
            </div>
          )}

          {rest.length > 0 && (
            <div key={`${activeEvent}-rest`} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {rest.map((entry, i) => (
                <div
                  key={`${entry.gymName}-${entry.studentName}-${i}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className="animate-tv-row-in flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 transition-all hover:-translate-y-0.5 hover:shadow-sm hover:bg-slate-50/60"
                >
                  <span className="w-7 h-7 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                    {i + 4}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate">{entry.studentName}</div>
                    <div className="text-[11px] text-slate-400 font-medium truncate">
                      {entry.gymName} · {entry.grade}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">{entry.count}회</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
