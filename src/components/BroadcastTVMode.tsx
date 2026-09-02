import React, { useState, useEffect } from 'react';
import { Student, JumpRecord, EventKey, EventMeta, StudentLeaderboardItem } from '../types';
import { getLeaderboardData } from '../lib/scoring';
import { parseClassLabels, studentInClass } from '../lib/classLabels';
import { EVENT_KEYS } from '../data/constants';
import { Flame, Crown, Play, Pause, Maximize2, Minimize2, ArrowRight, LayoutGrid, Users } from 'lucide-react';

// Rows shown per "page" of a fixed/paged ranking -- laid out 2 columns x 10
// rows so all 20 fit on one screen with no scrolling (a TV has no way to
// scroll it into view). Pages beyond the first keep the same shape.
const FIXED_RANK_COUNT = 20;
const OVERALL_DEFAULTS = 'OVERALL_DEFAULTS';
const ALL_SIX = 'ALL_SIX';
const ALL_SIX_ROWS_PER_EVENT = 7;
// Sentinel for "부별 보기" 반 selector -- cycles through every 반 in turn
// instead of staying pinned on one.
const ALL_CLASSES_AUTO = 'ALL_CLASSES_AUTO';
// How many rows a page shows within one event on the auto-rotate page --
// low-ranked kids never got to see their own name before because the old
// behavior only ever showed the top 10 for an event and then moved on.
// Now it pages through the whole roster (11-20, 21-30, ...) before
// advancing to the next event.
const ROTATE_PAGE_SIZE = 10;
const AUTO_PLAY_SECONDS_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];

// Shared row card -- same look everywhere on the TV screen (auto-rotate,
// fixed rankings, and the 6-event grid), just smaller via `compact` where
// space is tight, so a single visual language covers all of it.
const RankRow: React.FC<{
  item: StudentLeaderboardItem;
  // Local render position -- only drives the entrance-animation stagger.
  index: number;
  // 1-based rank to actually display/color. Defaults to index+1, but every
  // paginated view passes the true overall rank so page 2+ shows
  // "11, 12, ..." instead of restarting at 1 and wrongly re-coloring row 1
  // gold on every page.
  rank?: number;
  rowAnimDuration: number;
  rowStaggerStep: number;
  compact?: boolean;
}> = ({ item, index, rank, rowAnimDuration, rowStaggerStep, compact = false }) => {
  const displayRank = rank ?? index + 1;
  const badgeSize = compact ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-lg';
  const avatarSize = compact ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-base';
  const nameSize = compact ? 'text-sm' : 'text-lg';
  const gradeSize = compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';
  const dateSize = compact ? 'text-[10px]' : 'text-xs';
  const countSize = compact ? 'text-lg' : 'text-3xl';
  const rankColor =
    displayRank === 1
      ? 'bg-[#1B5E20] text-white'
      : displayRank === 2
      ? 'bg-slate-200 text-slate-800'
      : displayRank === 3
      ? 'bg-slate-300 text-slate-800'
      : 'text-slate-400';

  return (
    <div
      className={`${compact ? 'p-2.5 gap-2' : 'p-4 gap-4'} rounded-2xl border transition-all flex items-center justify-between shadow-xs ${
        displayRank === 1 ? 'bg-white border-2 border-[#1B5E20]' : 'bg-white border-slate-200/80'
      }`}
      style={{
        animation: `tv-row-in ${rowAnimDuration}s cubic-bezier(0.16, 1, 0.3, 1) both`,
        animationDelay: `${index * rowStaggerStep}s`,
      }}
    >
      <div className={`flex items-center min-w-0 ${compact ? 'gap-2' : 'gap-4'}`}>
        {/* Rank Number */}
        <div className={`${badgeSize} rounded-xl font-bold flex items-center justify-center shrink-0`}>
          {displayRank <= 3 ? (
            <span className={`${badgeSize} rounded-xl ${rankColor} flex items-center justify-center`}>
              {displayRank}
            </span>
          ) : (
            <span className={rankColor}>{displayRank}</span>
          )}
        </div>

        {/* Avatar */}
        <div
          className={`${avatarSize} rounded-xl bg-gradient-to-tr ${item.student.avatarColor} text-white font-bold flex items-center justify-center shrink-0`}
        >
          {item.student.name.substring(0, 1)}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`${nameSize} font-bold text-slate-900 truncate`}>{item.student.name}</span>
            <span className={`${gradeSize} rounded-full bg-slate-100 text-slate-600 font-bold shrink-0`}>
              {item.student.grade}
            </span>
          </div>
          <div className={`${dateSize} text-slate-400 font-medium mt-0.5 font-mono truncate`}>
            측정일: {item.recordDate}
          </div>
        </div>
      </div>

      {/* Record Count */}
      <div className="text-right shrink-0">
        <span className={`${countSize} font-bold text-slate-900 tracking-tight`}>{item.personalBestCount}</span>
        <span className={`${compact ? 'text-[10px]' : 'text-sm'} text-slate-500 font-bold ml-1`}>회</span>
      </div>
    </div>
  );
};

interface EventPanel {
  eventKey: string;
  meta?: EventMeta;
  items: StudentLeaderboardItem[];
  page: number;
  totalPages: number;
}

// Grid of small per-event ranking panels -- used both by the FIXED page's
// "종목별 한눈에 보기" view and the new BY_CLASS ("부별") view, which are
// the same layout over a different student subset. Each panel pages
// through its own event's full list independently (a panel with fewer
// students just loops on a shorter cycle), so `page` is per-panel, not
// shared.
const EventPanelsGrid: React.FC<{
  panels: EventPanel[];
  rowAnimDuration: number;
  rowStaggerStep: number;
}> = ({ panels, rowAnimDuration, rowStaggerStep }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {panels.map(({ eventKey, meta, items, page }, panelIndex) => (
      <div
        key={eventKey}
        className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs"
        style={{
          animation: `tv-row-in ${rowAnimDuration}s cubic-bezier(0.16, 1, 0.3, 1) both`,
          animationDelay: `${panelIndex * (rowStaggerStep / 2)}s`,
        }}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-900">{meta?.shortTitle ?? meta?.title}</span>
          <span className="text-[10px] font-mono font-bold text-slate-400">{meta?.timeSeconds}s</span>
        </div>
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-xs text-slate-300 text-center py-6">기록 없음</div>
          ) : (
            items.map((item, idx) => (
              <RankRow
                key={item.student.id}
                item={item}
                index={idx}
                rank={page * ALL_SIX_ROWS_PER_EVENT + idx + 1}
                rowAnimDuration={rowAnimDuration}
                rowStaggerStep={rowStaggerStep / 2}
                compact
              />
            ))
          )}
        </div>
      </div>
    ))}
  </div>
);

interface BroadcastTVModeProps {
  gymName: string;
  students: Student[];
  records: JumpRecord[];
  events: Record<string, EventMeta>;
  onClose: () => void;
}

export const BroadcastTVMode: React.FC<BroadcastTVModeProps> = ({
  gymName,
  students,
  records,
  events,
  onClose,
}) => {
  const eventKeys = Object.keys(events);
  // Default 6 events only, in their canonical 30s x3 -> 10s x3 order --
  // reused for the defaults-only overall score, the "all 6 at once" grid
  // (relies on this exact order for 30s events on top / 10s on bottom via
  // a 3-col CSS grid) and the by-class panels.
  const sixEventKeys = EVENT_KEYS.filter((k) => events[k]);
  // "모든 종목 순위" intentionally sums only the 6 default events (not
  // custom ones) so it stays a fair, universal comparison across gyms.
  const defaultEventsMap: Record<string, EventMeta> = Object.fromEntries(
    sixEventKeys.map((k) => [k, events[k]])
  );
  // 반/수업시간 assigned via the roster (see src/lib/classLabels.ts) --
  // empty when the gym never bothered assigning any.
  const classOptions = Array.from(new Set(students.flatMap((s) => parseClassLabels(s.classLabel)))).sort();
  const classCount = classOptions.length;

  const [displayMode, setDisplayMode] = useState<'ROTATE' | 'FIXED' | 'BY_CLASS'>('ROTATE');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // ROTATE (자동 전환): eventIndex = which event is showing; page = which
  // chunk of ROTATE_PAGE_SIZE ranks within that event (0 = 1-10, 1 = 11-20,
  // ...) -- kept together so they always advance in step.
  const [cursor, setCursor] = useState<{ eventIndex: number; page: number }>({ eventIndex: 0, page: 0 });
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [autoPlaySeconds, setAutoPlaySeconds] = useState<number>(5);

  // FIXED (고정 화면): the chosen ranking (종합/종목/종목별 한눈에) stays
  // selected -- it doesn't rotate through events like ROTATE does -- but it
  // now auto-pages through the whole roster (21-40, 41-60, ...) instead of
  // stopping at the top 20 forever.
  const [fixedView, setFixedView] = useState<string>(OVERALL_DEFAULTS);
  const [fixedPage, setFixedPage] = useState<number>(0);
  const [fixedAutoPlay, setFixedAutoPlay] = useState<boolean>(true);
  const [fixedAutoPlaySeconds, setFixedAutoPlaySeconds] = useState<number>(5);
  const isOverallDefaultsView = fixedView === OVERALL_DEFAULTS;
  const isAllSixView = fixedView === ALL_SIX;

  // BY_CLASS (부별): byClassView picks a single 반 to stay pinned on, or
  // ALL_CLASSES_AUTO to cycle through every 반 in turn. classCursor.page is
  // which page of that 반's per-event panels is showing (same "one event
  // per panel" layout as ALL_SIX, just scoped to that class's students);
  // classIndex only matters while auto-cycling.
  const [byClassView, setByClassView] = useState<string>(ALL_CLASSES_AUTO);
  const isAllClassesAuto = byClassView === ALL_CLASSES_AUTO;
  const [classCursor, setClassCursor] = useState<{ classIndex: number; page: number }>({ classIndex: 0, page: 0 });
  const [classAutoPlay, setClassAutoPlay] = useState<boolean>(true);
  const [classAutoPlaySeconds, setClassAutoPlaySeconds] = useState<number>(5);

  // Row entrance stagger scales with whichever mode is active's interval,
  // so a fast 3s cycle feels snappy and a slow 10s cycle feels deliberate.
  const activeAutoPlaySeconds =
    displayMode === 'FIXED' ? fixedAutoPlaySeconds : displayMode === 'BY_CLASS' ? classAutoPlaySeconds : autoPlaySeconds;
  const rowStaggerStep = activeAutoPlaySeconds * 0.06;
  const rowAnimDuration = 0.35 + activeAutoPlaySeconds * 0.03;

  // Re-mounting the FIXED page's rows is what replays their entrance
  // animation (React reuses a DOM node -- and its already-finished
  // animation -- whenever the key doesn't change). Bump this on every entry
  // into FIXED mode and every view change; the actual render key also
  // includes the current page so a page-advance replays it too (see below).
  const [fixedRenderKey, setFixedRenderKey] = useState<number>(0);
  useEffect(() => {
    if (displayMode === 'FIXED') setFixedRenderKey((k) => k + 1);
  }, [displayMode, fixedView]);
  useEffect(() => {
    setFixedPage(0);
  }, [fixedView]);
  useEffect(() => {
    setClassCursor({ classIndex: 0, page: 0 });
  }, [byClassView]);

  // ----- ROTATE derived data -----
  const currentEventIndex = cursor.eventIndex;
  const currentEventKey: EventKey = eventKeys[currentEventIndex] || eventKeys[0];
  const eventMeta = events[currentEventKey] || events[eventKeys[0]];
  const leaderboardItems = getLeaderboardData(students, records, currentEventKey, 'ALL', '', events);
  const totalPagesForEvent = Math.max(1, Math.ceil(leaderboardItems.length / ROTATE_PAGE_SIZE));
  // Clamp defensively -- if records changed underneath a running rotation
  // and shrank this event's list, don't render past the end of it.
  const currentPage = Math.min(cursor.page, totalPagesForEvent - 1);
  const pagedLeaderboardItems = leaderboardItems.slice(
    currentPage * ROTATE_PAGE_SIZE,
    currentPage * ROTATE_PAGE_SIZE + ROTATE_PAGE_SIZE
  );

  // ----- FIXED derived data -----
  const fixedFullItems = isAllSixView
    ? []
    : getLeaderboardData(
        students,
        records,
        isOverallDefaultsView ? 'OVERALL' : (fixedView as EventKey),
        'ALL',
        '',
        isOverallDefaultsView ? defaultEventsMap : events
      );
  const fixedSingleTotalPages = Math.max(1, Math.ceil(fixedFullItems.length / FIXED_RANK_COUNT));
  const fixedSinglePage = fixedPage % fixedSingleTotalPages;
  const fixedLeaderboardItems = fixedFullItems.slice(
    fixedSinglePage * FIXED_RANK_COUNT,
    fixedSinglePage * FIXED_RANK_COUNT + FIXED_RANK_COUNT
  );
  function buildEventPanels(panelStudents: Student[], page: number): EventPanel[] {
    return sixEventKeys.map((eventKey) => {
      const fullItems = getLeaderboardData(panelStudents, records, eventKey, 'ALL', '', events);
      const totalPages = Math.max(1, Math.ceil(fullItems.length / ALL_SIX_ROWS_PER_EVENT));
      const panelPage = page % totalPages;
      return {
        eventKey,
        meta: events[eventKey],
        page: panelPage,
        totalPages,
        items: fullItems.slice(
          panelPage * ALL_SIX_ROWS_PER_EVENT,
          panelPage * ALL_SIX_ROWS_PER_EVENT + ALL_SIX_ROWS_PER_EVENT
        ),
      };
    });
  }
  const allSixPanels: EventPanel[] = isAllSixView ? buildEventPanels(students, fixedPage) : [];
  const allSixTotalPages = allSixPanels.length > 0 ? Math.max(1, ...allSixPanels.map((p) => p.totalPages)) : 1;
  const fixedTotalPages = isAllSixView ? allSixTotalPages : fixedSingleTotalPages;

  // ----- BY_CLASS derived data -----
  const currentClassIndex = classCount > 0 ? classCursor.classIndex % classCount : 0;
  const currentClass = isAllClassesAuto ? classOptions[currentClassIndex] : byClassView;
  const classStudents = currentClass ? students.filter((s) => studentInClass(s.classLabel, currentClass)) : [];
  const classPanels: EventPanel[] = currentClass ? buildEventPanels(classStudents, classCursor.page) : [];
  const classTotalPages = classPanels.length > 0 ? Math.max(1, ...classPanels.map((p) => p.totalPages)) : 1;

  // Ticker tape is computed from real records, not placeholder names.
  const overallChampion = getLeaderboardData(students, records, 'OVERALL', 'ALL', '', events)[0];
  const perEventTopEntries = eventKeys
    .map((key) => {
      const top = getLeaderboardData(students, records, key, 'ALL', '', events)[0];
      return top ? { key, meta: events[key], student: top.student, count: top.personalBestCount } : null;
    })
    .filter((entry): entry is { key: string; meta: EventMeta; student: Student; count: number } => entry !== null);

  // Self-rescheduling timeout (not setInterval) -- `cursor` is in the deps,
  // so every advance re-runs this effect and arms a fresh full-length timer
  // for whatever's showing next, always reading fresh totalPagesForEvent
  // (computed above from current students/records/events) instead of a
  // stale closure from when the timer was first created.
  useEffect(() => {
    if (displayMode !== 'ROTATE' || !isAutoPlay || eventKeys.length === 0) return;
    const timer = setTimeout(() => {
      setCursor((prev) => {
        if (prev.page + 1 < totalPagesForEvent) {
          return { eventIndex: prev.eventIndex, page: prev.page + 1 };
        }
        return { eventIndex: (prev.eventIndex + 1) % eventKeys.length, page: 0 };
      });
    }, autoPlaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [displayMode, isAutoPlay, autoPlaySeconds, cursor, eventKeys.length, totalPagesForEvent]);

  // FIXED auto-page: same self-rescheduling pattern, just advancing (and
  // looping) the page within whichever view is selected instead of ever
  // switching the view itself.
  useEffect(() => {
    if (displayMode !== 'FIXED' || !fixedAutoPlay) return;
    const timer = setTimeout(() => {
      setFixedPage((p) => (p + 1) % fixedTotalPages);
    }, fixedAutoPlaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [displayMode, fixedAutoPlay, fixedAutoPlaySeconds, fixedPage, fixedTotalPages]);

  // BY_CLASS auto-advance: pages through the current class's panels. While
  // auto-cycling every 반, it moves to the next class once every panel has
  // cycled through; pinned to one 반, it just loops that class's own pages
  // forever instead of ever switching class.
  useEffect(() => {
    if (displayMode !== 'BY_CLASS' || !classAutoPlay || classCount === 0) return;
    const timer = setTimeout(() => {
      setClassCursor((prev) => {
        if (!isAllClassesAuto) {
          return { classIndex: prev.classIndex, page: (prev.page + 1) % classTotalPages };
        }
        if (prev.page + 1 < classTotalPages) {
          return { classIndex: prev.classIndex, page: prev.page + 1 };
        }
        return { classIndex: (prev.classIndex + 1) % classCount, page: 0 };
      });
    }, classAutoPlaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [displayMode, classAutoPlay, classAutoPlaySeconds, classCursor, classCount, classTotalPages, isAllClassesAuto]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  // Single progress bar reused across all 3 modes -- what it tracks
  // (event+page, fixed page, or class+page) depends on which is active.
  const activeIsAutoPlay = displayMode === 'FIXED' ? fixedAutoPlay : displayMode === 'BY_CLASS' ? classAutoPlay : isAutoPlay;
  const progressKey =
    displayMode === 'FIXED'
      ? `fixed-${fixedView}-${isAllSixView ? fixedPage : fixedSinglePage}`
      : displayMode === 'BY_CLASS'
      ? `class-${currentClass}-${classCursor.page}`
      : `rotate-${currentEventIndex}-${currentPage}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#f4f5f8] text-slate-900 flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#1B5E20] flex items-center justify-center">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold text-slate-900">
                {gymName} TV 랭킹 전광판
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-600 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                LIVE STREAM
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {gymName} 명예의 전당 • 실시간 기록 보드
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* 3-way mode switch */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setDisplayMode('ROTATE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'ROTATE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Version 1</span>
            </button>
            <button
              onClick={() => setDisplayMode('FIXED')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'FIXED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Version 2</span>
            </button>
            <button
              onClick={() => setDisplayMode('BY_CLASS')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'BY_CLASS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Version 3</span>
            </button>
          </div>

          {displayMode === 'ROTATE' && (
            <>
              <button
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                  isAutoPlay
                    ? 'bg-[#1B5E20] border-[#1B5E20] text-white'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoPlay ? `자동 전환 중 (${autoPlaySeconds}초)` : '자동 전환 정지'}</span>
              </button>

              <select
                value={autoPlaySeconds}
                onChange={(e) => setAutoPlaySeconds(Number(e.target.value))}
                title="전환 간격"
                className="px-2 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold focus:outline-none cursor-pointer"
              >
                {AUTO_PLAY_SECONDS_OPTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}초
                  </option>
                ))}
              </select>
            </>
          )}

          {displayMode === 'FIXED' && (
            <>
              <select
                value={fixedView}
                onChange={(e) => setFixedView(e.target.value)}
                title="고정 화면에 표시할 순위"
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold focus:outline-none cursor-pointer max-w-[220px]"
              >
                <option value={OVERALL_DEFAULTS}>종합 순위 (기본 6종목 합산)</option>
                <option value={ALL_SIX}>종목별 한눈에 보기 (6종목)</option>
                <optgroup label="종목별 순위">
                  {eventKeys.map((key) => (
                    <option key={key} value={key}>
                      {events[key]?.title ?? key}
                    </option>
                  ))}
                </optgroup>
              </select>

              <button
                onClick={() => setFixedAutoPlay(!fixedAutoPlay)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                  fixedAutoPlay
                    ? 'bg-[#1B5E20] border-[#1B5E20] text-white'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {fixedAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{fixedAutoPlay ? `자동 전환 중 (${fixedAutoPlaySeconds}초)` : '자동 전환 정지'}</span>
              </button>

              <select
                value={fixedAutoPlaySeconds}
                onChange={(e) => setFixedAutoPlaySeconds(Number(e.target.value))}
                title="전환 간격"
                className="px-2 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold focus:outline-none cursor-pointer"
              >
                {AUTO_PLAY_SECONDS_OPTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}초
                  </option>
                ))}
              </select>
            </>
          )}

          {displayMode === 'BY_CLASS' && (
            <>
              <select
                value={byClassView}
                onChange={(e) => setByClassView(e.target.value)}
                disabled={classCount === 0}
                title="부별 보기에 표시할 반"
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold focus:outline-none cursor-pointer disabled:opacity-50 max-w-[160px]"
              >
                <option value={ALL_CLASSES_AUTO}>전체 반 순차 표시</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setClassAutoPlay(!classAutoPlay)}
                disabled={classCount === 0}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 ${
                  classAutoPlay
                    ? 'bg-[#1B5E20] border-[#1B5E20] text-white'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {classAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{classAutoPlay ? `자동 전환 중 (${classAutoPlaySeconds}초)` : '자동 전환 정지'}</span>
              </button>

              <select
                value={classAutoPlaySeconds}
                onChange={(e) => setClassAutoPlaySeconds(Number(e.target.value))}
                title="전환 간격"
                className="px-2 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold focus:outline-none cursor-pointer"
              >
                {AUTO_PLAY_SECONDS_OPTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}초
                  </option>
                ))}
              </select>
            </>
          )}

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

      {/* Auto-transition progress bar -- shared across all 3 modes */}
      <div className="relative z-10 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
        {activeIsAutoPlay && (
          <div
            key={`${progressKey}-${activeAutoPlaySeconds}`}
            className="h-full bg-[#1B5E20] rounded-full"
            style={{ animation: `tv-progress ${activeAutoPlaySeconds}s linear` }}
          />
        )}
      </div>

      {displayMode === 'FIXED' && (
        <div
          key={`${fixedRenderKey}-${isAllSixView ? fixedPage : fixedSinglePage}`}
          className="relative z-10 my-auto animate-tv-transition"
        >
          <div className="text-center mb-5">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              {isOverallDefaultsView
                ? '종합 순위'
                : isAllSixView
                ? '종목별 한눈에 보기'
                : events[fixedView]?.title ?? fixedView}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1.5">
              {isOverallDefaultsView
                ? '기본 6종목 환산 점수 합산 순위'
                : isAllSixView
                ? '기본 6종목 순위를 한 화면에서 확인'
                : events[fixedView]
                ? `측정 시간 ${events[fixedView].timeSeconds}초 · ${events[fixedView].description}`
                : ''}
              {fixedTotalPages > 1 &&
                ` · ${(isAllSixView ? fixedPage % allSixTotalPages : fixedSinglePage) + 1}/${fixedTotalPages} 페이지`}
            </p>
          </div>

          {isAllSixView ? (
            <EventPanelsGrid panels={allSixPanels} rowAnimDuration={rowAnimDuration} rowStaggerStep={rowStaggerStep} />
          ) : fixedLeaderboardItems.length === 0 ? (
            <div className="text-center text-slate-400 font-bold py-16">아직 등록된 기록이 없습니다.</div>
          ) : (
            // Same row card and size as the auto-rotating page, laid out
            // 2 columns x 10 rows (FIXED_RANK_COUNT / 2 -- keep the 10 in
            // grid-rows in sync if that constant changes): ranks fill the
            // left column top-to-bottom before the right column starts
            // (grid-flow-col + explicit row count), not zigzag. No scroll --
            // a TV has no way to scroll it into view.
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-flow-col lg:grid-rows-[repeat(10,auto)] gap-3">
              {fixedLeaderboardItems.map((item, index) => (
                <RankRow
                  key={item.student.id}
                  item={item}
                  index={index}
                  rank={fixedSinglePage * FIXED_RANK_COUNT + index + 1}
                  rowAnimDuration={rowAnimDuration}
                  rowStaggerStep={rowStaggerStep / 2}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {displayMode === 'BY_CLASS' && (
        <div key={`class-${currentClass}-${classCursor.page}`} className="relative z-10 my-auto animate-tv-transition">
          {classCount === 0 ? (
            <div className="text-center text-slate-400 font-bold py-16">
              반 정보가 없습니다. 수련생 관리에서 학생들에게 반을 지정해 주세요.
            </div>
          ) : (
            <>
              <div className="text-center mb-5">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{currentClass} 반 순위</h1>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1.5">
                  {currentClass} 수련생 {classStudents.length}명 · 종목별 순위
                  {classTotalPages > 1 ? ` · ${(classCursor.page % classTotalPages) + 1}/${classTotalPages} 페이지` : ''}
                  {isAllClassesAuto ? ` · 반 ${currentClassIndex + 1}/${classCount}` : ''}
                </p>
              </div>
              <EventPanelsGrid panels={classPanels} rowAnimDuration={rowAnimDuration} rowStaggerStep={rowStaggerStep} />
            </>
          )}
        </div>
      )}

      {/* Main Discipline Banner & Rankings */}
      {displayMode === 'ROTATE' && (
      <div
        key={`${currentEventKey}-${currentPage}`}
        className="relative z-10 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-tv-transition"
      >
        {/* Left: Active Discipline Spotlight (4 cols) */}
        <div className="lg:col-span-4 bg-[#1B5E20] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">
              CURRENT EVENT
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              {eventMeta.title}
            </h1>
            <div className="inline-flex flex-wrap items-center gap-1.5 mt-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-white font-bold text-xs">
                측정 시간: {eventMeta.timeSeconds}초
              </span>
              {leaderboardItems.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-white/10 text-white font-bold text-xs">
                  {currentPage * ROTATE_PAGE_SIZE + 1}~{currentPage * ROTATE_PAGE_SIZE + pagedLeaderboardItems.length}위
                  {totalPagesForEvent > 1 ? ` (${currentPage + 1}/${totalPagesForEvent})` : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed font-medium">
              {eventMeta.description}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>종목 {eventKeys.length}개 중 {currentEventIndex + 1}번째</span>
            <button
              onClick={() => setCursor((prev) => ({ eventIndex: (prev.eventIndex + 1) % eventKeys.length, page: 0 }))}
              className="text-white hover:text-slate-300 flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>다음 종목</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Live Rankings (8 cols) -- pages through the whole roster
            for this event (1-10, 11-20, ...) instead of stopping at the
            top 10, so kids ranked lower still get their turn on screen. */}
        <div className="lg:col-span-8 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
          {pagedLeaderboardItems.length === 0 ? (
            <div className="text-center text-slate-400 font-bold py-16">아직 이 종목 기록이 없습니다.</div>
          ) : (
            pagedLeaderboardItems.map((item, index) => (
              <RankRow
                key={item.student.id}
                item={item}
                index={index}
                rank={currentPage * ROTATE_PAGE_SIZE + index + 1}
                rowAnimDuration={rowAnimDuration}
                rowStaggerStep={rowStaggerStep}
              />
            ))
          )}
        </div>
      </div>
      )}

      {/* Bottom Ticker Tape */}
      <div className="relative z-10 bg-white border border-slate-200/90 py-2.5 px-4 overflow-hidden rounded-2xl shadow-xs">
        <div className="whitespace-nowrap animate-marquee flex items-center gap-8 text-xs text-slate-700 font-bold">
          {overallChampion && (
            <>
              <span className="text-slate-900 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-slate-400" />
                {gymName} 종합 챔피언: {overallChampion.student.name} ({overallChampion.overallScore}점)
              </span>
              <span>•</span>
            </>
          )}
          {perEventTopEntries.map((entry, idx) => (
            <React.Fragment key={entry.key}>
              <span className="text-slate-800">
                {entry.meta.shortTitle} 1위: {entry.student.name} ({entry.count}회)
              </span>
              {idx < perEventTopEntries.length - 1 && <span>•</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
