import React from 'react';
import { StudentLeaderboardItem, DisplayTab } from '../types';
import { Trophy, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PodiumProps {
  topThree: StudentLeaderboardItem[];
  activeTab: DisplayTab;
  onSelectStudent: (studentId: string) => void;
}

export const Podium: React.FC<PodiumProps> = ({ topThree, activeTab, onSelectStudent }) => {
  if (!topThree || topThree.length === 0) return null;

  const handleCelebrate = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const getUnit = () => (activeTab === 'OVERALL' ? '점' : '회');

  // Podium order: 2nd left, 1st center, 3rd right.
  const byRank = new Map(topThree.map((item) => [item.rank, item]));
  const ordered = [byRank.get(2), byRank.get(1), byRank.get(3)].filter(
    (item): item is StudentLeaderboardItem => !!item
  );

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-5 h-5 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">TOP 3 HALL OF FAME</h3>
        </div>
        <button
          onClick={handleCelebrate}
          className="text-xs px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all flex items-center gap-1.5"
        >
          <Crown className="w-3.5 h-3.5" />
          <span>축하 폭죽 터뜨리기</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-end">
        {ordered.map((item) => {
          const isFirst = item.rank === 1;
          return (
            <button
              key={item.student.id}
              onClick={() => onSelectStudent(item.student.id)}
              className={`rounded-2xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                isFirst
                  ? 'p-6 bg-[#E8F5E9] border-2 border-[#1B5E20] shadow-md'
                  : 'p-4 bg-white border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <span
                className={`rounded-full font-bold flex items-center justify-center shrink-0 mb-2 ${
                  isFirst ? 'w-9 h-9 text-base bg-[#1B5E20] text-white' : 'w-7 h-7 text-xs bg-slate-100 text-slate-600'
                }`}
              >
                {item.rank}
              </span>
              <div
                className={`rounded-xl bg-gradient-to-tr ${item.student.avatarColor} text-white font-bold flex items-center justify-center shrink-0 mb-2 ${
                  isFirst ? 'w-16 h-16 text-2xl' : 'w-11 h-11 text-base'
                }`}
              >
                {item.student.name.substring(0, 1)}
              </div>
              <div className={`font-bold text-slate-900 truncate max-w-full ${isFirst ? 'text-base' : 'text-sm'}`}>
                {item.student.name}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mb-2">{item.student.grade}</div>
              <div className={isFirst ? 'text-2xl font-bold text-[#1B5E20]' : 'text-lg font-bold text-slate-900'}>
                {item.personalBestCount.toLocaleString()}
                <span className="text-xs font-semibold ml-0.5 text-slate-500">{getUnit()}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
