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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {topThree.map((item) => (
          <button
            key={item.student.id}
            onClick={() => onSelectStudent(item.student.id)}
            className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
              item.rank === 1
                ? 'bg-[#E8F5E9] border-[#A5D6A7]'
                : 'bg-white border-slate-200/90 hover:border-slate-300'
            }`}
          >
            <span
              className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center shrink-0 ${
                item.rank === 1 ? 'bg-[#1B5E20] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.rank}
            </span>
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${item.student.avatarColor} text-white font-bold flex items-center justify-center shrink-0`}
            >
              {item.student.name.substring(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-slate-900 truncate">{item.student.name}</div>
              <div className="text-[11px] text-slate-500 font-semibold">{item.student.grade}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-slate-900">
                {item.personalBestCount.toLocaleString()}
                <span className="text-xs text-slate-500 font-semibold ml-0.5">{getUnit()}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
