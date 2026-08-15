import React from 'react';
import { DisplayTab, TimeFilter, EventMeta } from '../types';
import { Footprints, Zap, Flame, Clock, Gauge, Trophy, Award, Crown, Sparkles } from 'lucide-react';

interface EventSelectorProps {
  events: Record<string, EventMeta>;
  activeTab: DisplayTab;
  setActiveTab: (tab: DisplayTab) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
}

export const EventSelector: React.FC<EventSelectorProps> = ({
  events,
  activeTab,
  setActiveTab,
  timeFilter,
  setTimeFilter,
}) => {
  const getIcon = (key?: string) => {
    switch (key) {
      case 'Footprints':
        return <Footprints className="w-4 h-4" />;
      case 'Zap':
        return <Zap className="w-4 h-4" />;
      case 'Flame':
        return <Flame className="w-4 h-4" />;
      case 'Clock':
        return <Clock className="w-4 h-4" />;
      case 'Gauge':
        return <Gauge className="w-4 h-4" />;
      case 'Trophy':
        return <Trophy className="w-4 h-4" />;
      default:
        return <Award className="w-4 h-4" />;
    }
  };

  const allEventEntries = Object.entries(events) as [string, EventMeta][];
  const thirtySecEvents = allEventEntries.filter(([_, meta]) => meta.timeSeconds === 30);
  const tenSecEvents = allEventEntries.filter(([_, meta]) => meta.timeSeconds === 10);
  const otherSecEvents = allEventEntries.filter(([_, meta]) => meta.timeSeconds !== 30 && meta.timeSeconds !== 10);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm mb-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-3.5">
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            용인대 파워점핑줄넘기
          </h2>
          <p className="text-base font-black text-slate-900 mt-0.5 flex items-center gap-2">
            공식 스피드 측정 종목 ({allEventEntries.length}개) & 종합 랭킹
          </p>
        </div>

        {/* Quick Filter */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 text-xs font-bold uppercase tracking-wider self-start sm:self-auto">
          <button
            onClick={() => setTimeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeFilter === 'ALL'
                ? 'bg-white text-orange-600 border border-slate-200 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            전체 보기
          </button>
          <button
            onClick={() => setTimeFilter('30S')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeFilter === '30S'
                ? 'bg-orange-500 text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            30초 종목
          </button>
          <button
            onClick={() => setTimeFilter('10S')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeFilter === '10S'
                ? 'bg-amber-500 text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            10초 종목
          </button>
        </div>
      </div>

      {/* Row-based Layout */}
      <div className="flex flex-col gap-4">
        {/* Row 1: 종합랭킹 */}
        {timeFilter === 'ALL' && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>종합 랭킹</span>
            </div>
            <button
              onClick={() => setActiveTab('OVERALL')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left relative overflow-hidden group cursor-pointer ${
                activeTab === 'OVERALL'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white border-orange-400 shadow-md shadow-orange-500/20'
                  : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs ${
                    activeTab === 'OVERALL' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div
                    className={`text-sm font-black flex items-center gap-2 ${
                      activeTab === 'OVERALL' ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    <span>👑 종합 랭킹</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTab === 'OVERALL' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600 border border-orange-200/60'
                      }`}
                    >
                      전종목 통합
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-0.5 font-medium ${
                      activeTab === 'OVERALL' ? 'text-orange-50' : 'text-slate-500'
                    }`}
                  >
                    체육관의 모든 측정 종목 환산점수를 합산한 대표 종합 스피드 랭킹
                  </div>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                  activeTab === 'OVERALL' ? 'bg-white text-orange-600 shadow-xs' : 'bg-slate-200/80 text-slate-700'
                }`}
              >
                {activeTab === 'OVERALL' ? '선택됨' : '선택'}
              </span>
            </button>
          </div>
        )}

        {/* Row 2: 30초 종목 */}
        {(timeFilter === 'ALL' || timeFilter === '30S') && thirtySecEvents.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-orange-600">
                <Zap className="w-4 h-4" />
                <span>30초 스피드 종목 ({thirtySecEvents.length})</span>
              </span>
              <span className="text-[10px] font-mono bg-orange-50 text-orange-600 px-2.5 py-0.5 rounded-full border border-orange-200/60 font-bold">
                30 Seconds
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {thirtySecEvents.map(([key, meta]) => {
                const isSelected = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                        : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600 border border-orange-100'
                        }`}
                      >
                        {getIcon(meta.iconName)}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-black truncate flex items-center gap-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          <span>{meta.title}</span>
                          {meta.isCustom && (
                            <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                              커스텀
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-orange-50' : 'text-slate-500'}`}>
                          {meta.technique}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      30s
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 3: 10초 종목 */}
        {(timeFilter === 'ALL' || timeFilter === '10S') && tenSecEvents.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-600">
                <Flame className="w-4 h-4" />
                <span>10초 순발력 종목 ({tenSecEvents.length})</span>
              </span>
              <span className="text-[10px] font-mono bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full border border-amber-200/60 font-bold">
                10 Seconds
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tenSecEvents.map(([key, meta]) => {
                const isSelected = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}
                      >
                        {getIcon(meta.iconName)}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-black truncate flex items-center gap-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          <span>{meta.title}</span>
                          {meta.isCustom && (
                            <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                              커스텀
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-amber-50' : 'text-slate-500'}`}>
                          {meta.technique}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      10s
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 4: 맞춤/사용자 정의 기타 종목 */}
        {otherSecEvents.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-indigo-600">
                <Sparkles className="w-4 h-4" />
                <span>체육관 맞춤 측정 종목 ({otherSecEvents.length})</span>
              </span>
              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full border border-indigo-200/60 font-bold">
                Custom Duration
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {otherSecEvents.map(([key, meta]) => {
                const isSelected = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}
                      >
                        {getIcon(meta.iconName)}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-black truncate flex items-center gap-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          <span>{meta.title}</span>
                          <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
                            맞춤종목
                          </span>
                        </div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-50' : 'text-slate-500'}`}>
                          {meta.technique}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {meta.timeSeconds}s
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


