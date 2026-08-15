import React from 'react';
import { StudentLeaderboardItem, DisplayTab } from '../types';
import { Trophy, Crown, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PodiumProps {
  topThree: StudentLeaderboardItem[];
  activeTab: DisplayTab;
  onSelectStudent: (studentId: string) => void;
}

export const Podium: React.FC<PodiumProps> = ({
  topThree,
  activeTab,
  onSelectStudent,
}) => {
  if (!topThree || topThree.length === 0) return null;

  const firstPlace = topThree[0];
  const secondPlace = topThree[1];
  const thirdPlace = topThree[2];

  const handleCelebrate = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const getUnit = () => (activeTab === 'OVERALL' ? '점' : '회');

  return (
    <div className="mb-8">
      {/* Podium Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
            TOP 3 HALL OF FAME
          </h3>
        </div>
        <button
          onClick={handleCelebrate}
          className="text-xs px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 font-bold transition-all flex items-center gap-1.5 uppercase tracking-wider shadow-xs"
        >
          <Crown className="w-3.5 h-3.5 text-orange-500" />
          <span>축하 폭죽 터뜨리기 🎉</span>
        </button>
      </div>

      {/* Podium Layout: 2nd Place (Left), 1st Place (Center - Highest), 3rd Place (Right) */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end">
        {/* 2nd Place (Silver) */}
        <div className="flex flex-col items-center">
          {secondPlace ? (
            <button
              onClick={() => onSelectStudent(secondPlace.student.id)}
              className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 hover:border-slate-300 transition-all shadow-xs group text-center relative overflow-hidden flex flex-col items-center"
            >
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="w-7 h-7 bg-slate-200 text-slate-800 font-black rounded-full flex items-center justify-center italic text-sm shadow-xs border border-slate-300">
                  2
                </span>
              </div>

              {/* Avatar Circle */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 border-2 border-slate-300 p-0.5 shadow-xs mb-2 mt-5 group-hover:scale-105 transition-transform">
                <div
                  className={`w-full h-full rounded-xl bg-gradient-to-tr ${secondPlace.student.avatarColor} flex items-center justify-center text-white font-black text-base sm:text-lg`}
                >
                  {secondPlace.student.name.substring(0, 1)}
                </div>
              </div>

              <span className="text-xs sm:text-sm font-black text-slate-900 truncate w-full">
                {secondPlace.student.name}
              </span>
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                {secondPlace.student.grade}
              </span>

              <div className="mt-3 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200/80 w-full text-center">
                <div className="text-xl sm:text-2xl font-black text-slate-800 italic">
                  {secondPlace.personalBestCount.toLocaleString()}
                  <span className="text-xs text-slate-500 font-bold not-italic ml-1">{getUnit()}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {secondPlace.recordDate}
                </div>
              </div>
            </button>
          ) : (
            <div className="w-full bg-white/60 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 text-xs">
              2위 대기중
            </div>
          )}
          {/* Silver Base Block */}
          <div className="w-full h-16 sm:h-20 bg-slate-200/90 border-t border-slate-300/80 rounded-t-xl mt-2 flex items-center justify-center font-black text-2xl italic text-slate-400/80 shadow-xs">
            2ND
          </div>
        </div>

        {/* 1st Place (Gold - Taller & Highlighted) */}
        <div className="flex flex-col items-center">
          {firstPlace ? (
            <button
              onClick={() => onSelectStudent(firstPlace.student.id)}
              className="w-full bg-gradient-to-b from-amber-50/60 via-white to-white border-2 border-amber-400 rounded-2xl p-3 sm:p-5 hover:border-amber-500 transition-all shadow-md shadow-amber-500/10 group text-center relative overflow-hidden flex flex-col items-center"
            >
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="w-8 h-8 bg-amber-400 text-slate-950 font-black rounded-full flex items-center justify-center italic text-base shadow-sm">
                  1
                </span>
              </div>

              {/* Fire/Crown Avatar Box */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500 p-0.5 shadow-md mb-2 mt-5 group-hover:scale-105 transition-transform relative">
                <div
                  className={`w-full h-full rounded-[14px] bg-gradient-to-tr ${firstPlace.student.avatarColor} flex items-center justify-center text-white font-black text-lg sm:text-2xl shadow-inner`}
                >
                  {firstPlace.student.name.substring(0, 1)}
                </div>
                <div className="absolute -top-2 -right-1 bg-orange-500 text-white p-1 rounded-full shadow-md">
                  <Flame className="w-4 h-4 fill-white" />
                </div>
              </div>

              <span className="text-sm sm:text-base font-black text-slate-900 truncate w-full">
                {firstPlace.student.name}
              </span>
              <span className="text-xs text-orange-600 font-bold uppercase tracking-wider">
                {firstPlace.student.grade}
              </span>

              <div className="mt-3 bg-orange-50 rounded-xl px-3 py-2 border border-orange-200/80 w-full text-center">
                <div className="text-2xl sm:text-3xl font-black text-orange-600 italic tracking-tight">
                  {firstPlace.personalBestCount.toLocaleString()}
                  <span className="text-xs text-orange-500 font-bold not-italic ml-1">{getUnit()}</span>
                </div>
                <div className="text-[10px] text-orange-600/80 truncate font-mono">
                  CHAMPION • {firstPlace.recordDate}
                </div>
              </div>
            </button>
          ) : (
            <div className="w-full bg-white/60 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 text-xs">
              1위 대기중
            </div>
          )}
          {/* Gold Base Block */}
          <div className="w-full h-24 sm:h-28 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-xl mt-2 flex items-center justify-center font-black text-3xl italic text-white/90 shadow-sm">
            1ST
          </div>
        </div>

        {/* 3rd Place (Bronze) */}
        <div className="flex flex-col items-center">
          {thirdPlace ? (
            <button
              onClick={() => onSelectStudent(thirdPlace.student.id)}
              className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 hover:border-amber-300 transition-all shadow-xs group text-center relative overflow-hidden flex flex-col items-center"
            >
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="w-7 h-7 bg-amber-600 text-white font-black rounded-full flex items-center justify-center italic text-sm shadow-xs">
                  3
                </span>
              </div>

              {/* Avatar Circle */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50 border-2 border-amber-300 p-0.5 shadow-xs mb-2 mt-5 group-hover:scale-105 transition-transform">
                <div
                  className={`w-full h-full rounded-xl bg-gradient-to-tr ${thirdPlace.student.avatarColor} flex items-center justify-center text-white font-black text-base sm:text-lg`}
                >
                  {thirdPlace.student.name.substring(0, 1)}
                </div>
              </div>

              <span className="text-xs sm:text-sm font-black text-slate-900 truncate w-full">
                {thirdPlace.student.name}
              </span>
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                {thirdPlace.student.grade}
              </span>

              <div className="mt-3 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200/80 w-full text-center">
                <div className="text-xl sm:text-2xl font-black text-amber-700 italic">
                  {thirdPlace.personalBestCount.toLocaleString()}
                  <span className="text-xs text-slate-500 font-bold not-italic ml-1">{getUnit()}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {thirdPlace.recordDate}
                </div>
              </div>
            </button>
          ) : (
            <div className="w-full bg-white/60 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 text-xs">
              3위 대기중
            </div>
          )}
          {/* Bronze Base Block */}
          <div className="w-full h-12 sm:h-14 bg-amber-100 border-t border-amber-200 rounded-t-xl mt-2 flex items-center justify-center font-black text-xl italic text-amber-700/80 shadow-xs">
            3RD
          </div>
        </div>
      </div>
    </div>
  );
};
