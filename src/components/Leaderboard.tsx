import React from 'react';
import { StudentLeaderboardItem, DisplayTab, GradeCategoryFilter } from '../types';
import { EVENTS, GRADE_CATEGORY_LABELS, getBadgeForCount } from '../data/constants';
import { Search, Filter, Trophy, Sparkles, ArrowRight } from 'lucide-react';

interface LeaderboardProps {
  items: StudentLeaderboardItem[];
  activeTab: DisplayTab;
  gradeFilter: GradeCategoryFilter;
  setGradeFilter: (filter: GradeCategoryFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectStudent: (studentId: string) => void;
  onOpenBatchEntry: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  items,
  activeTab,
  gradeFilter,
  setGradeFilter,
  searchQuery,
  setSearchQuery,
  onSelectStudent,
  onOpenBatchEntry,
}) => {
  const currentEventMeta = activeTab !== 'OVERALL' ? EVENTS[activeTab] : null;
  const maxCountInList = items.length > 0 ? items[0].personalBestCount || 1 : 1;

  const gradeFilterOptions: GradeCategoryFilter[] = [
    'ALL',
    'KINDER',
    'LOWER_ELEM',
    'UPPER_ELEM',
    'SECONDARY',
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
      {/* Top Search & Grade Category Filters */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="수련생 이름 또는 번호 검색..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Grade Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          {gradeFilterOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setGradeFilter(opt)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                gradeFilter === opt
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {GRADE_CATEGORY_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Discipline Info Banner */}
      <div className="px-4 py-3.5 sm:px-6 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200/80 flex items-center justify-center text-orange-600">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm text-slate-900 tracking-wide">
                {activeTab === 'OVERALL' ? '👑 OVERALL SPEED RANKING' : currentEventMeta?.title}
              </h4>
              {currentEventMeta && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-orange-600 border border-orange-200/80">
                  {currentEventMeta.timeSeconds}s
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {activeTab === 'OVERALL'
                ? '6개 측정 종목 환산 점수 합산 체육관 통합 랭킹'
                : currentEventMeta?.description}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenBatchEntry}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>기록 일괄등록</span>
        </button>
      </div>

      {/* Table Header Bar */}
      <div className="hidden sm:grid sm:grid-cols-[80px_1fr_120px_160px] px-6 py-3 border-b border-slate-200/80 bg-slate-100/70 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
        <span>Rank</span>
        <span>Name & Badge</span>
        <span className="text-center">Grade</span>
        <span className="text-right">Score (Counts)</span>
      </div>

      {/* Leaderboard Items */}
      {items.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-600">등록된 랭킹 기록이 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">
            상단 [기록 일괄등록] 버튼을 눌러 아이들의 기록을 추가해 보세요!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const percentage = Math.min(
              100,
              Math.max(10, Math.round((item.personalBestCount / maxCountInList) * 100))
            );

            const badgeTitle =
              activeTab !== 'OVERALL'
                ? getBadgeForCount(activeTab, item.personalBestCount)
                : item.rank === 1
                ? '👑 종합 챔피언'
                : item.rank <= 3
                ? '⚡ 스피드 마스터'
                : '⭐ 에이스 수련생';

            return (
              <div
                key={item.student.id}
                onClick={() => onSelectStudent(item.student.id)}
                className={`group px-4 sm:px-6 py-4 transition-all cursor-pointer flex flex-col sm:grid sm:grid-cols-[80px_1fr_120px_160px] sm:items-center gap-3 hover:bg-slate-50/90 ${
                  item.rank === 1 ? 'bg-amber-50/40' : ''
                }`}
              >
                {/* Rank Badge */}
                <div className="flex items-center sm:justify-start">
                  {item.rank === 1 ? (
                    <span className="w-8 h-8 bg-amber-400 text-slate-950 font-black rounded-full flex items-center justify-center italic text-base shadow-xs">
                      1
                    </span>
                  ) : item.rank === 2 ? (
                    <span className="w-8 h-8 bg-slate-200 text-slate-800 font-black rounded-full flex items-center justify-center italic text-base border border-slate-300">
                      2
                    </span>
                  ) : item.rank === 3 ? (
                    <span className="w-8 h-8 bg-amber-600 text-white font-black rounded-full flex items-center justify-center italic text-base">
                      3
                    </span>
                  ) : (
                    <span className="text-slate-400 font-black italic text-base ml-2">
                      {item.rank}
                    </span>
                  )}
                </div>

                {/* Name & Avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.student.avatarColor} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                  >
                    {item.student.name.substring(0, 1)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-slate-900 group-hover:text-orange-600 transition-colors">
                        {item.student.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                        {item.student.studentNo.slice(-3)}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200/60">
                        {badgeTitle}
                      </span>
                    </div>

                    {/* Progress Bar Visualizer */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden border border-slate-200/60">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          item.rank === 1
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                            : item.rank <= 3
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                            : 'bg-gradient-to-r from-orange-400 to-orange-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Grade */}
                <div className="text-left sm:text-center text-xs font-bold text-slate-600 uppercase">
                  {item.student.grade}
                </div>

                {/* Record Count */}
                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                  <div className="text-2xl sm:text-3xl font-black text-orange-600 italic tracking-tight group-hover:scale-105 transition-transform">
                    {item.personalBestCount.toLocaleString()}
                    <span className="text-xs text-slate-500 font-bold not-italic ml-1">
                      {activeTab === 'OVERALL' ? '점' : '회'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {item.recordDate || '기록 없음'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
