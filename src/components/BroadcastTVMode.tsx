import React, { useState, useEffect } from 'react';
import { Student, JumpRecord, EventKey, EventMeta, StudentLeaderboardItem } from '../types';
import { getLeaderboardData } from '../lib/scoring';
import { EVENT_KEYS } from '../data/constants';
import { Flame, Crown, Play, Pause, Maximize2, Minimize2, ArrowRight, LayoutGrid } from 'lucide-react';

// Rows shown on the fixed (non-rotating) page -- laid out 2 columns x 15
// rows (matching the auto-rotate page's card size) so 30 fit on one screen.
const FIXED_RANK_COUNT = 30;
const OVERALL_DEFAULTS = 'OVERALL_DEFAULTS';
const ALL_SIX = 'ALL_SIX';
const ALL_SIX_ROWS_PER_EVENT = 5;

// Shared row card -- same look everywhere on the TV screen (auto-rotate,
// fixed rankings, and the 6-event grid), just smaller via `compact` where
// space is tight, so a single visual language covers all of it.
const RankRow: React.FC<{
  item: StudentLeaderboardItem;
  index: number;
  rowAnimDuration: number;
  rowStaggerStep: number;
  compact?: boolean;
}> = ({ item, index, rowAnimDuration, rowStaggerStep, compact = false }) => {
  const badgeSize = compact ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-lg';
  const avatarSize = compact ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-base';
  const nameSize = compact ? 'text-sm' : 'text-lg';
  const gradeSize = compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';
  const dateSize = compact ? 'text-[10px]' : 'text-xs';
  const countSize = compact ? 'text-lg' : 'text-3xl';
  const rankColor =
    index === 0
      ? 'bg-[#1B5E20] text-white'
      : index === 1
      ? 'bg-slate-200 text-slate-800'
      : index === 2
      ? 'bg-slate-300 text-slate-800'
      : 'text-slate-400';

  return (
    <div
      className={`${compact ? 'p-2.5 gap-2' : 'p-4 gap-4'} rounded-2xl border transition-all flex items-center justify-between shadow-xs ${
        index === 0 ? 'bg-white border-2 border-[#1B5E20]' : 'bg-white border-slate-200/80'
      }`}
      style={{
        animation: `tv-row-in ${rowAnimDuration}s cubic-bezier(0.16, 1, 0.3, 1) both`,
        animationDelay: `${index * rowStaggerStep}s`,
      }}
    >
      <div className={`flex items-center min-w-0 ${compact ? 'gap-2' : 'gap-4'}`}>
        {/* Rank Number */}
        <div className={`${badgeSize} rounded-xl font-bold flex items-center justify-center shrink-0`}>
          {index <= 2 ? (
            <span className={`${badgeSize} rounded-xl ${rankColor} flex items-center justify-center`}>
              {index + 1}
            </span>
          ) : (
            <span className={rankColor}>{index + 1}</span>
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
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [autoPlaySeconds, setAutoPlaySeconds] = useState<number>(5);

  // Fixed (non-rotating) page -- shown instead of the auto-transitioning
  // view above when the coach wants one ranking to just sit on screen.
  const [displayMode, setDisplayMode] = useState<'ROTATE' | 'FIXED'>('ROTATE');
  const [fixedView, setFixedView] = useState<string>(OVERALL_DEFAULTS);
  const isOverallDefaultsView = fixedView === OVERALL_DEFAULTS;
  const isAllSixView = fixedView === ALL_SIX;
  // Default 6 events only, in their canonical 30s x3 -> 10s x3 order --
  // reused both for the defaults-only overall score and for the "all 6 at
  // once" grid (which relies on this exact order to put 30s events on the
  // top row and 10s events on the bottom row via a 3-col CSS grid).
  const sixEventKeys = EVENT_KEYS.filter((k) => events[k]);
  // "모든 종목 순위" intentionally sums only the 6 default events (not
  // custom ones) so it stays a fair, universal comparison across gyms.
  const defaultEventsMap: Record<string, EventMeta> = Object.fromEntries(
    sixEventKeys.map((k) => [k, events[k]])
  );
  const fixedLeaderboardItems = isAllSixView
    ? []
    : getLeaderboardData(
        students,
        records,
        isOverallDefaultsView ? 'OVERALL' : (fixedView as EventKey),
        'ALL',
        '',
        isOverallDefaultsView ? defaultEventsMap : events
      ).slice(0, FIXED_RANK_COUNT);

  // Row entrance stagger scales with the auto-transition interval, so a
  // fast 3s cycle feels snappy and a slow 8s cycle feels more deliberate.
  const rowStaggerStep = autoPlaySeconds * 0.06;
  const rowAnimDuration = 0.35 + autoPlaySeconds * 0.03;

  // Re-mounting the FIXED page's rows is what replays their entrance
  // animation (React reuses a DOM node -- and its already-finished
  // animation -- whenever the key doesn't change, which is why only the
  // very first visit used to animate). Bump this on every entry into FIXED
  // mode and every view change so the stagger-in replays each time.
  const [fixedRenderKey, setFixedRenderKey] = useState<number>(0);
  useEffect(() => {
    if (displayMode === 'FIXED') setFixedRenderKey((k) => k + 1);
  }, [displayMode, fixedView]);

  const currentEventKey: EventKey = eventKeys[currentEventIndex] || eventKeys[0];
  const eventMeta = events[currentEventKey] || events[eventKeys[0]];

  const leaderboardItems = getLeaderboardData(students, records, currentEventKey, 'ALL', '', events);

  // Ticker tape is computed from real records, not placeholder names.
  const overallChampion = getLeaderboardData(students, records, 'OVERALL', 'ALL', '', events)[0];
  const perEventTopEntries = eventKeys
    .map((key) => {
      const top = getLeaderboardData(students, records, key, 'ALL', '', events)[0];
      return top ? { key, meta: events[key], student: top.student, count: top.personalBestCount } : null;
    })
    .filter((entry): entry is { key: string; meta: EventMeta; student: Student; count: number } => entry !== null);

  useEffect(() => {
    if (displayMode !== 'ROTATE' || !isAutoPlay || eventKeys.length === 0) return;
    const timer = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % eventKeys.length);
    }, autoPlaySeconds * 1000);
    return () => clearInterval(timer);
  }, [displayMode, isAutoPlay, autoPlaySeconds, eventKeys.length]);

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
          {/* Rotate vs Fixed Page Switch */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setDisplayMode('ROTATE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'ROTATE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>자동 전환</span>
            </button>
            <button
              onClick={() => setDisplayMode('FIXED')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'FIXED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>고정 화면</span>
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
                {[3, 4, 5, 6, 7, 8].map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}초
                  </option>
                ))}
              </select>
            </>
          )}

          {displayMode === 'FIXED' && (
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

      {/* Auto-transition progress bar */}
      {displayMode === 'ROTATE' && (
        <div className="relative z-10 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
          {isAutoPlay && (
            <div
              key={`${currentEventIndex}-${autoPlaySeconds}`}
              className="h-full bg-[#1B5E20] rounded-full"
              style={{ animation: `tv-progress ${autoPlaySeconds}s linear` }}
            />
          )}
        </div>
      )}

      {displayMode === 'FIXED' && (
        <div key={fixedRenderKey} className="relative z-10 my-auto animate-tv-transition">
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
            </p>
          </div>

          {isAllSixView ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sixEventKeys.map((eventKey, panelIndex) => {
                const meta = events[eventKey];
                const items = getLeaderboardData(students, records, eventKey, 'ALL', '', events).slice(
                  0,
                  ALL_SIX_ROWS_PER_EVENT
                );
                return (
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
                    <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                      {items.length === 0 ? (
                        <div className="text-xs text-slate-300 text-center py-6">기록 없음</div>
                      ) : (
                        items.map((item, idx) => (
                          <RankRow
                            key={item.student.id}
                            item={item}
                            index={idx}
                            rowAnimDuration={rowAnimDuration}
                            rowStaggerStep={rowStaggerStep / 2}
                            compact
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : fixedLeaderboardItems.length === 0 ? (
            <div className="text-center text-slate-400 font-bold py-16">아직 등록된 기록이 없습니다.</div>
          ) : (
            // Same row card and size as the auto-rotating page, laid out
            // 2 columns x 15 rows (~30 people): ranks 1-15 fill the left
            // column top-to-bottom before 16-30 start the right column
            // (grid-flow-col + explicit row count), not left-right zigzag.
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-flow-col lg:grid-rows-[repeat(15,auto)] gap-3 max-h-[80vh] overflow-y-auto pr-1">
              {fixedLeaderboardItems.map((item, index) => (
                <RankRow
                  key={item.student.id}
                  item={item}
                  index={index}
                  rowAnimDuration={rowAnimDuration}
                  rowStaggerStep={rowStaggerStep / 2}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Discipline Banner & Rankings */}
      {displayMode === 'ROTATE' && (
      <div
        key={currentEventKey}
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
            <div className="inline-block mt-3 px-3 py-1 rounded-full bg-white/10 text-white font-bold text-xs">
              측정 시간: {eventMeta.timeSeconds}초
            </div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed font-medium">
              {eventMeta.description}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>종목 {eventKeys.length}개 중 {currentEventIndex + 1}번째</span>
            <button
              onClick={() => setCurrentEventIndex((prev) => (prev + 1) % eventKeys.length)}
              className="text-white hover:text-slate-300 flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>다음 종목</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Top 10 Live Rankings (8 cols) -- same card size as before,
            just more of them, so it scrolls if the viewport is too short
            to show all 10 at once. */}
        <div className="lg:col-span-8 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
          {leaderboardItems.slice(0, 10).map((item, index) => (
            <RankRow
              key={item.student.id}
              item={item}
              index={index}
              rowAnimDuration={rowAnimDuration}
              rowStaggerStep={rowStaggerStep}
            />
          ))}
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
