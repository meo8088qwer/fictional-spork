import React, { useState, useEffect } from 'react';
import { Student, JumpRecord, EventKey, EventMeta } from '../types';
import { getLeaderboardData } from '../lib/storage';
import { Flame, Crown, Play, Pause, Maximize2, Minimize2, ArrowRight } from 'lucide-react';

interface BroadcastTVModeProps {
  students: Student[];
  records: JumpRecord[];
  events: Record<string, EventMeta>;
  onClose: () => void;
}

export const BroadcastTVMode: React.FC<BroadcastTVModeProps> = ({
  students,
  records,
  events,
  onClose,
}) => {
  const eventKeys = Object.keys(events);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const currentEventKey: EventKey = eventKeys[currentEventIndex] || eventKeys[0];
  const eventMeta = events[currentEventKey] || events[eventKeys[0]];

  const leaderboardItems = getLeaderboardData(students, records, currentEventKey, 'ALL', '', events);

  // Auto slide every 8 seconds
  useEffect(() => {
    if (!isAutoPlay || eventKeys.length === 0) return;
    const timer = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % eventKeys.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isAutoPlay, eventKeys.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f4f5f8] text-slate-900 flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 p-0.5 shadow-md">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Flame className="w-7 h-7 text-orange-500 animate-bounce" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-slate-900">
                용인대 파워점핑 TV 랭킹 전광판
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 border border-red-200 text-red-600 font-extrabold flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                LIVE STREAM
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              용인대 파워점핑줄넘기 체육관 명예의 전당 • 실시간 기록 보드
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
              isAutoPlay
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoPlay ? '자동 전환 중 (8초)' : '자동 전환 정지'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all shadow-xs"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all shadow-xs"
          >
            전광판 닫기
          </button>
        </div>
      </div>

      {/* Main Discipline Banner & Rankings */}
      <div className="relative z-10 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Active Discipline Spotlight (4 cols) */}
        <div className="lg:col-span-4 bg-white border-2 border-orange-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-black text-orange-600 tracking-wider uppercase mb-2">
              CURRENT EVENT
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {eventMeta.title}
            </h1>
            <div className="inline-block mt-3 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-600 font-extrabold text-xs">
              측정 시간: {eventMeta.timeSeconds}초
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">
              {eventMeta.description}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>종목 {eventKeys.length}개 중 {currentEventIndex + 1}번째</span>
            <button
              onClick={() => setCurrentEventIndex((prev) => (prev + 1) % eventKeys.length)}
              className="text-orange-600 hover:text-orange-700 flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>다음 종목</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Top 5 Live Rankings (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {leaderboardItems.slice(0, 5).map((item, index) => (
            <div
              key={item.student.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between shadow-xs ${
                index === 0
                  ? 'bg-gradient-to-r from-amber-50 via-white to-white border-2 border-amber-400 shadow-md shadow-amber-500/10 scale-[1.02]'
                  : index === 1
                  ? 'bg-white border-slate-200'
                  : index === 2
                  ? 'bg-white border-amber-200'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank Number */}
                <div className="w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center shrink-0">
                  {index === 0 ? (
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                      1
                    </span>
                  ) : index === 2 ? (
                    <span className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                      3
                    </span>
                  ) : index === 1 ? (
                    <span className="w-10 h-10 rounded-xl bg-slate-200 text-slate-800 border border-slate-300 flex items-center justify-center">
                      2
                    </span>
                  ) : (
                    <span className="text-slate-400">{index + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${item.student.avatarColor} text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs`}
                >
                  {item.student.name.substring(0, 1)}
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-900">
                      {item.student.name}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold">
                      {item.student.grade}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5 font-mono">
                    측정일: {item.recordDate}
                  </div>
                </div>
              </div>

              {/* Record Count */}
              <div className="text-right">
                <span className="text-3xl font-black text-orange-600 tracking-tight italic">
                  {item.personalBestCount}
                </span>
                <span className="text-sm text-slate-500 font-bold ml-1">회</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Ticker Tape */}
      <div className="relative z-10 bg-white border border-slate-200/90 py-2.5 px-4 overflow-hidden rounded-2xl shadow-xs">
        <div className="whitespace-nowrap animate-marquee flex items-center gap-8 text-xs text-slate-700 font-bold">
          <span className="text-orange-600 flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            파워점핑 줄넘기 체육관 최다 기록 챔피언: 강도현 (30초 번갈아 142회)
          </span>
          <span>•</span>
          <span className="text-slate-800">
            30초 양발모아뛰기 1위: 김지후 (128회)
          </span>
          <span>•</span>
          <span className="text-slate-800">
            30초 이중뛰기 1위: 박준우 (82회)
          </span>
          <span>•</span>
          <span className="text-slate-800">
            10초 번갈아뛰기 1위: 이서아 (51회)
          </span>
        </div>
      </div>
    </div>
  );
};
