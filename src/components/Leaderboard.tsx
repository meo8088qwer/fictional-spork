import React from 'react';
import { StudentLeaderboardItem, DisplayTab, GradeCategory, GradeCategoryFilter, GradeGroup, EventMeta } from '../types';
import { GRADE_CATEGORY_LABELS, GRADE_SUBCATEGORIES, getBadgeForCount } from '../data/constants';
import { Search, Filter, Trophy, Sparkles } from 'lucide-react';

const CATEGORY_OPTIONS: GradeCategory[] = ['ALL', 'KINDER', 'LOWER_ELEM', 'UPPER_ELEM', 'SECONDARY'];

interface LeaderboardProps {
  items: StudentLeaderboardItem[];
  events: Record<string, EventMeta>;
  activeTab: DisplayTab;
  gradeFilter: GradeCategoryFilter;
  setGradeFilter: (filter: GradeCategoryFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectStudent: (studentId: string) => void;
  onOpenBatchEntry?: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  items,
  events,
  activeTab,
  gradeFilter,
  setGradeFilter,
  searchQuery,
  setSearchQuery,
  onSelectStudent,
  onOpenBatchEntry,
}) => {
  const currentEventMeta = activeTab !== 'OVERALL' ? events[activeTab] : null;
  const maxCountInList = items.length > 0 ? items[0].personalBestCount || 1 : 1;

  // gradeFilter is either a broad category or a specific grade drilled into
  // from that category -- figure out which category is active either way.
  const activeCategory: GradeCategory =
    (CATEGORY_OPTIONS as GradeCategoryFilter[]).includes(gradeFilter)
      ? (gradeFilter as GradeCategory)
      : (Object.entries(GRADE_SUBCATEGORIES).find(([, grades]) =>
          grades.includes(gradeFilter as GradeGroup)
        )?.[0] as GradeCategory) ?? 'ALL';
  const subGrades = activeCategory !== 'ALL' ? GRADE_SUBCATEGORIES[activeCategory] : null;

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
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#66BB6A] focus:ring-1 focus:ring-[#66BB6A] transition-all font-medium shadow-xs"
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
        <div className="flex flex-col gap-1.5 items-start md:items-end w-full md:w-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold w-full min-w-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setGradeFilter(opt)}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                  activeCategory === opt
                    ? 'bg-[#1B5E20] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {GRADE_CATEGORY_LABELS[opt]}
              </button>
            ))}
          </div>

          {subGrades && (
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold w-full min-w-0">
              {subGrades.map((grade) => (
                <button
                  key={grade}
                  onClick={() => setGradeFilter(grade)}
                  className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                    gradeFilter === grade
                      ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Discipline Info Banner */}
      <div className="px-4 py-3.5 sm:px-6 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900 tracking-wide">
                {activeTab === 'OVERALL' ? 'OVERALL SPEED RANKING' : currentEventMeta?.title}
              </h4>
              {currentEventMeta && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
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

        {onOpenBatchEntry && (
          <button
            onClick={onOpenBatchEntry}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>기록 일괄등록</span>
          </button>
        )}
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
                ? getBadgeForCount(events[activeTab], item.personalBestCount)
                : item.rank === 1
                ? '종합 챔피언'
                : item.rank <= 3
                ? '스피드 마스터'
                : '에이스 수련생';

            return (
              <div
                key={item.student.id}
                onClick={() => onSelectStudent(item.student.id)}
                className="group px-4 sm:px-6 py-4 transition-all cursor-pointer flex flex-col sm:grid sm:grid-cols-[80px_1fr_120px_160px] sm:items-center gap-3 hover:bg-slate-50/90"
              >
                {/* Rank Badge */}
                <div className="flex items-center sm:justify-start">
                  {item.rank === 1 ? (
                    <span className="w-8 h-8 bg-[#1B5E20] text-white font-bold rounded-full flex items-center justify-center text-base">
                      1
                    </span>
                  ) : item.rank === 2 ? (
                    <span className="w-8 h-8 bg-slate-200 text-slate-800 font-bold rounded-full flex items-center justify-center text-base">
                      2
                    </span>
                  ) : item.rank === 3 ? (
                    <span className="w-8 h-8 bg-slate-300 text-slate-800 font-bold rounded-full flex items-center justify-center text-base">
                      3
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold text-base ml-2">
                      {item.rank}
                    </span>
                  )}
                </div>

                {/* Name & Avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.student.avatarColor} text-white font-bold text-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    {item.student.name.substring(0, 1)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-slate-900">
                        {item.student.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {item.student.studentNo.slice(-3)}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {badgeTitle}
                      </span>
                    </div>

                    {/* Progress Bar Visualizer */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 rounded-full bg-[#1B5E20]"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Grade */}
                <div className="text-left sm:text-center text-xs font-bold text-slate-600">
                  {item.student.grade}
                </div>

                {/* Record Count */}
                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {item.personalBestCount.toLocaleString()}
                    <span className="text-xs text-slate-500 font-semibold ml-1">
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
