import React, { useState } from 'react';
import { DisplayTab, TimeFilter, EventMeta } from '../types';
import { Footprints, Zap, Flame, Clock, Gauge, Trophy, Award, Crown, Sparkles, ChevronDown } from 'lucide-react';

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
  // Mobile-only accordion state -- section headers stay static (always-open) on
  // sm+ via the `sm:grid` override below, so this state has no effect on desktop.
  const [openSections, setOpenSections] = useState<{ thirty: boolean; ten: boolean; custom: boolean }>({
    thirty: false,
    ten: false,
    custom: false,
  });

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
  // Custom events always land in their own "맞춤 종목" section below, even
  // when they happen to share a duration (10s/30s) with the default events --
  // otherwise a custom 30s event would get lost inside the default 30초 row.
  const thirtySecEvents = allEventEntries.filter(([_, meta]) => !meta.isCustom && meta.timeSeconds === 30);
  const tenSecEvents = allEventEntries.filter(([_, meta]) => !meta.isCustom && meta.timeSeconds === 10);
  const otherSecEvents = allEventEntries.filter(([_, meta]) => meta.isCustom);

  const renderEventCard = (key: string, meta: EventMeta) => {
    const isSelected = activeTab === key;
    return (
      <button
        key={key}
        onClick={() => setActiveTab(key)}
        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
          isSelected
            ? 'bg-[#1B5E20] text-white border-[#1B5E20]'
            : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-lg ${
              isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {getIcon(meta.iconName)}
          </div>
          <div className="min-w-0">
            <div className={`text-xs font-bold truncate flex items-center gap-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
              <span>{meta.title}</span>
              {meta.isCustom && (
                <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  커스텀
                </span>
              )}
            </div>
            <div className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
              {meta.technique}
            </div>
          </div>
        </div>
        <span
          className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md shrink-0 ${
            isSelected ? 'bg-white/15 text-white' : 'bg-slate-200/80 text-slate-600'
          }`}
        >
          {meta.timeSeconds}s
        </span>
      </button>
    );
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm mb-6">
      {/* Quick Filter */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 text-xs font-bold">
          <button
            onClick={() => setTimeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeFilter === 'ALL' ? 'bg-[#1B5E20] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            전체 보기
          </button>
          <button
            onClick={() => setTimeFilter('30S')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeFilter === '30S' ? 'bg-[#1B5E20] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            30초 종목
          </button>
          <button
            onClick={() => setTimeFilter('10S')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeFilter === '10S' ? 'bg-[#1B5E20] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            10초 종목
          </button>
          {otherSecEvents.length > 0 && (
            <button
              onClick={() => setTimeFilter('CUSTOM')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeFilter === 'CUSTOM' ? 'bg-[#1B5E20] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              커스텀
            </button>
          )}
        </div>
      </div>

      {/* Row-based Layout */}
      <div className="flex flex-col gap-4">
        {/* Row 1: 종합랭킹 */}
        {timeFilter === 'ALL' && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-slate-400" />
              <span>종합 랭킹</span>
            </div>
            <button
              onClick={() => setActiveTab('OVERALL')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left cursor-pointer ${
                activeTab === 'OVERALL'
                  ? 'bg-[#1B5E20] text-white border-[#1B5E20]'
                  : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activeTab === 'OVERALL' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div
                    className={`text-sm font-bold flex items-center gap-2 ${
                      activeTab === 'OVERALL' ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    <span>종합 랭킹</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTab === 'OVERALL' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      전종목 통합
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-0.5 font-medium ${
                      activeTab === 'OVERALL' ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    체육관의 모든 측정 종목 환산점수를 합산한 대표 종합 스피드 랭킹
                  </div>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                  activeTab === 'OVERALL' ? 'bg-white text-[#1B5E20]' : 'bg-slate-200/80 text-slate-700'
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
            <button
              type="button"
              onClick={() => setOpenSections((s) => ({ ...s, thirty: !s.thirty }))}
              className="w-full text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2 flex items-center justify-between gap-1.5 sm:pointer-events-none sm:cursor-default"
            >
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-slate-400" />
                <span>30초 스피드 종목 ({thirtySecEvents.length})</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 sm:hidden transition-transform ${openSections.thirty ? 'rotate-180' : ''}`}
              />
            </button>
            <div className={`${openSections.thirty ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-3 gap-3`}>
              {thirtySecEvents.map(([key, meta]) => renderEventCard(key, meta))}
            </div>
          </div>
        )}

        {/* Row 3: 10초 종목 */}
        {(timeFilter === 'ALL' || timeFilter === '10S') && tenSecEvents.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setOpenSections((s) => ({ ...s, ten: !s.ten }))}
              className="w-full text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2 flex items-center justify-between gap-1.5 sm:pointer-events-none sm:cursor-default"
            >
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-slate-400" />
                <span>10초 순발력 종목 ({tenSecEvents.length})</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 sm:hidden transition-transform ${openSections.ten ? 'rotate-180' : ''}`}
              />
            </button>
            <div className={`${openSections.ten ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-3 gap-3`}>
              {tenSecEvents.map(([key, meta]) => renderEventCard(key, meta))}
            </div>
          </div>
        )}

        {/* Row 4: 맞춤/사용자 정의 기타 종목 */}
        {(timeFilter === 'ALL' || timeFilter === 'CUSTOM') && otherSecEvents.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setOpenSections((s) => ({ ...s, custom: !s.custom }))}
              className="w-full text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2 flex items-center justify-between gap-1.5 sm:pointer-events-none sm:cursor-default"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-slate-400" />
                <span>체육관 맞춤 측정 종목 ({otherSecEvents.length})</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 sm:hidden transition-transform ${openSections.custom ? 'rotate-180' : ''}`}
              />
            </button>
            <div className={`${openSections.custom ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-3 gap-3`}>
              {otherSecEvents.map(([key, meta]) => renderEventCard(key, meta))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
