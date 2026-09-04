import React, { useMemo, useRef, useState } from 'react';
import { Student, JumpRecord, EventMeta } from '../types';
import { getStudentPersonalBest } from '../lib/scoring';
import { EVENT_KEYS, DEFAULT_EVENTS } from '../data/constants';
import { X, Download, Loader2, Crown, TrendingUp, Calendar, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas-pro';

// Pure client-side, read-only: every card type below is computed from the
// `records`/`events` already loaded by the parent (StudentProfileModal) --
// no new queries, no writes, so there's no way this feature can corrupt
// data. Charts are hand-drawn inline SVG (not recharts) so html2canvas has
// a plain, deterministic DOM to rasterize -- no ResponsiveContainer resize
// quirks, no library weight added. html2canvas itself only runs once, on
// a user tap (download/share), never on every render, so there's no
// per-frame cost from having 5 types x 4 palettes available.

type CardType = 'RECORD' | 'GROWTH' | 'TODAY' | 'ABILITY' | 'MONTHLY_REPORT';
type PaletteKey = 'BLACK_GREEN' | 'WHITE_GREEN' | 'BLACK_PURPLE' | 'CREAM_ORANGE';

interface Palette {
  label: string;
  bg: string;
  text: string;
  subtext: string;
  accent: string;
  chip: string;
  pillText: string;
  swatch: string;
}

const PALETTES: Record<PaletteKey, Palette> = {
  BLACK_GREEN: {
    label: '블랙 · 그린',
    bg: '#0B0F0D',
    text: '#FFFFFF',
    subtext: '#9CA3AF',
    accent: '#7ED957',
    chip: 'rgba(255,255,255,0.08)',
    pillText: '#0B0F0D',
    swatch: 'linear-gradient(135deg,#0B0F0D 50%,#7ED957 50%)',
  },
  WHITE_GREEN: {
    label: '화이트 · 그린',
    bg: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    accent: '#1B5E20',
    chip: '#F1F5F9',
    pillText: '#FFFFFF',
    swatch: 'linear-gradient(135deg,#FFFFFF 50%,#1B5E20 50%)',
  },
  BLACK_PURPLE: {
    label: '블랙 · 퍼플',
    bg: '#0B0A14',
    text: '#FFFFFF',
    subtext: '#A5A3C9',
    accent: '#A855F7',
    chip: 'rgba(255,255,255,0.08)',
    pillText: '#FFFFFF',
    swatch: 'linear-gradient(135deg,#0B0A14 50%,#A855F7 50%)',
  },
  CREAM_ORANGE: {
    label: '크림 · 오렌지',
    bg: '#FFF3E0',
    text: '#3E2723',
    subtext: '#9C6B4F',
    accent: '#F57C00',
    chip: 'rgba(0,0,0,0.05)',
    pillText: '#FFFFFF',
    swatch: 'linear-gradient(135deg,#FFF3E0 50%,#F57C00 50%)',
  },
};

// The other 4 types (GROWTH/TODAY/ABILITY/MONTHLY_REPORT) are built and
// working, just temporarily hidden from the tab list below while only
// "최고기록 인증" ships -- re-add their entries here when it's time to
// bring them back, no other code needs to change.
const CARD_TYPES: { id: CardType; label: string; sublabel: string }[] = [
  { id: 'RECORD', label: '최고기록 인증', sublabel: '최고기록만 심플하게' },
];

// Kept small deliberately -- has to fit inside the modal with room to spare
// on the narrowest common phone width (~320px) without any horizontal
// scrolling.
const CARD_WIDTH = 230;
const CARD_HEIGHT = 409; // 9:16

interface ShareCardModalProps {
  student: Student;
  records: JumpRecord[];
  events: Record<string, EventMeta>;
  initialEventKey?: string;
  onClose: () => void;
}

function Sparkline({
  points,
  width,
  height,
  color,
}: {
  points: number[];
  width: number;
  height: number;
  color: string;
}) {
  if (points.length === 0) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const pad = 6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + (points.length > 1 ? i * stepX : innerW / 2);
    const y = pad + innerH - ((p - min) / range) * innerH;
    return [x, y] as const;
  });
  const linePoints = coords.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 5 : 3} fill={color} />
      ))}
    </svg>
  );
}

function RadarChart({
  axes,
  size,
  color,
  gridColor,
  labelColor,
}: {
  axes: { label: string; score: number }[];
  size: number;
  color: string;
  gridColor: string;
  labelColor: string;
}) {
  const n = axes.length;
  const center = size / 2;
  const radius = size / 2 - 30;
  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointFor = (i: number, r: number): [number, number] => {
    const a = angleFor(i);
    return [center + r * Math.cos(a), center + r * Math.sin(a)];
  };
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = axes.map((ax, i) => pointFor(i, (Math.max(0, Math.min(100, ax.score)) / 100) * radius));
  const dataPath = dataPoints.map((p) => p.join(',')).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((lvl) => (
        <polygon
          key={lvl}
          points={Array.from({ length: n }, (_, i) => pointFor(i, radius * lvl).join(',')).join(' ')}
          fill="none"
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pointFor(i, radius);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke={gridColor} strokeWidth={1} />;
      })}
      <polygon points={dataPath} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={2} />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill={color} />
      ))}
      {axes.map((ax, i) => {
        const [lx, ly] = pointFor(i, radius + 18);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            fill={labelColor}
            fontSize={10}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {ax.label} {Math.round(ax.score)}
          </text>
        );
      })}
    </svg>
  );
}

function monthlyBestOf(records: JumpRecord[]): { month: string; best: number }[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const month = r.date.slice(0, 7);
    map.set(month, Math.max(map.get(month) ?? 0, r.count));
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, best]) => ({ month, best }));
}

function tierFor(score: number): string {
  if (score >= 90) return 'DIAMOND PLAYER';
  if (score >= 75) return 'GOLD PLAYER';
  if (score >= 50) return 'SILVER PLAYER';
  return 'BRONZE PLAYER';
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  student,
  records,
  events,
  initialEventKey,
  onClose,
}) => {
  const eventKeys = Object.keys(events);
  const studentRecords = useMemo(() => records.filter((r) => r.studentId === student.id), [records, student.id]);
  const eventKeysWithRecords = eventKeys.filter((k) => studentRecords.some((r) => r.eventKey === k));
  const defaultEventKey =
    (initialEventKey && events[initialEventKey] ? initialEventKey : undefined) ||
    eventKeysWithRecords[0] ||
    eventKeys[0] ||
    '';

  const [cardType, setCardType] = useState<CardType>('RECORD');
  const [paletteKey, setPaletteKey] = useState<PaletteKey>('BLACK_GREEN');
  const [selectedEventKey, setSelectedEventKey] = useState<string>(defaultEventKey);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const palette = PALETTES[paletteKey];

  const meta = events[selectedEventKey];
  const eventRecords = useMemo(
    () =>
      studentRecords
        .filter((r) => r.eventKey === selectedEventKey)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [studentRecords, selectedEventKey]
  );
  const pb = getStudentPersonalBest(records, student.id, selectedEventKey);

  const abilityAxes = useMemo(() => {
    return EVENT_KEYS.filter((k) => events[k]).map((k) => {
      const axisMeta = events[k];
      const axisPb = getStudentPersonalBest(records, student.id, k);
      const benchmarkPro = axisMeta.benchmarkPro || DEFAULT_EVENTS[k]?.benchmarkPro || 0;
      const score = benchmarkPro > 0 && axisPb ? Math.min(100, Math.round((axisPb.count / benchmarkPro) * 100)) : 0;
      return { label: axisMeta.shortTitle || axisMeta.title, score };
    });
  }, [events, records, student.id]);
  const abilityAvgScore =
    abilityAxes.length > 0 ? Math.round(abilityAxes.reduce((sum, a) => sum + a.score, 0) / abilityAxes.length) : 0;

  const thisMonthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonthRecords = eventRecords.filter((r) => r.date.startsWith(thisMonthPrefix));
  const monthlyBest = monthlyBestOf(eventRecords).slice(-3);

  const canRenderCard: boolean = (() => {
    if (cardType === 'ABILITY') return abilityAxes.length >= 3;
    if (!selectedEventKey || !meta) return false;
    if (cardType === 'MONTHLY_REPORT') return thisMonthRecords.length > 0;
    return eventRecords.length > 0;
  })();

  const handleDownload = async () => {
    if (!cardRef.current || !canRenderCard) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: palette.bg,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `${student.name}_ROPERANK_${cardType}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Share card image generation error:', err);
      alert('이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const Footer = () => (
    <div className="text-center mt-auto">
      <div className="text-[15px] font-black tracking-wide" style={{ color: palette.accent }}>
        ROPERANK
      </div>
      <div className="text-[10px] font-bold mt-0.5" style={{ color: palette.subtext }}>
        기록하고, 성장하고, 경쟁하다.
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex-1 flex items-center justify-center text-center px-6">
      <p className="text-xs font-bold" style={{ color: palette.subtext }}>
        {message}
      </p>
    </div>
  );

  const renderCardBody = () => {
    if (cardType === 'ABILITY') {
      if (abilityAxes.length < 3) {
        return <EmptyState message="기본 종목이 3개 이상 등록돼야 능력치 카드를 만들 수 있어요." />;
      }
      return (
        <>
          <div className="text-center mb-1">
            <div className="text-xl font-black tracking-tight" style={{ color: palette.accent }}>
              MY ROPE ABILITY
            </div>
            <div className="text-[11px] font-bold mt-1" style={{ color: palette.subtext }}>
              {student.name}의 줄넘기 능력치
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <RadarChart
              axes={abilityAxes}
              size={220}
              color={palette.accent}
              gridColor={palette.chip}
              labelColor={palette.text}
            />
          </div>
          <div className="text-center mb-2">
            <div className="text-[11px] font-bold" style={{ color: palette.subtext }}>
              종합 점수
            </div>
            <div className="text-3xl font-black" style={{ color: palette.text }}>
              {abilityAvgScore}
              <span className="text-base font-bold" style={{ color: palette.subtext }}>
                {' '}
                / 100
              </span>
            </div>
            <div
              className="inline-block mt-2 px-3 py-1 rounded-full text-[11px] font-black"
              style={{ background: palette.accent, color: palette.pillText }}
            >
              {tierFor(abilityAvgScore)}
            </div>
          </div>
        </>
      );
    }

    if (!selectedEventKey || !meta) {
      return <EmptyState message="측정 종목을 선택해 주세요." />;
    }

    if (cardType === 'RECORD') {
      if (!pb) return <EmptyState message="이 종목은 아직 기록이 없어요." />;
      return (
        <>
          <div className="text-[13px] font-black tracking-wide" style={{ color: palette.accent }}>
            ROPERANK
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <div className="text-xs font-black tracking-widest" style={{ color: palette.accent }}>
              NEW RECORD
            </div>
            <div className="text-sm font-bold" style={{ color: palette.subtext }}>
              {meta.title}
            </div>
            <Crown className="w-7 h-7 mt-1" style={{ color: palette.accent }} />
            <div className="text-6xl font-black leading-none" style={{ color: palette.text }}>
              {pb.count}
              <span className="text-2xl font-black">회</span>
            </div>
            <div
              className="mt-3 px-4 py-1.5 rounded-full text-xs font-black"
              style={{ background: palette.accent, color: palette.pillText }}
            >
              최고기록 달성!
            </div>
          </div>
          <div className="text-center mb-3">
            <div className="text-sm font-bold" style={{ color: palette.text }}>
              {student.name}
            </div>
            <div className="text-[10px] font-mono font-bold" style={{ color: palette.subtext }}>
              {pb.date}
            </div>
          </div>
        </>
      );
    }

    if (cardType === 'GROWTH') {
      if (monthlyBest.length === 0) return <EmptyState message="이 종목은 아직 기록이 없어요." />;
      const first = monthlyBest[0];
      const last = monthlyBest[monthlyBest.length - 1];
      const diff = last.best - first.best;
      return (
        <>
          <div className="text-center mb-1">
            <div className="text-xl font-black tracking-tight" style={{ color: palette.text }}>
              MY GROWTH
            </div>
            <div className="text-[11px] font-bold mt-1" style={{ color: palette.subtext }}>
              {meta.title} 기록 변화
            </div>
          </div>
          <div
            className="flex items-center gap-2 mx-auto mb-3 px-3 py-1.5 rounded-full"
            style={{ background: palette.chip }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
              style={{ background: palette.accent, color: palette.pillText }}
            >
              {student.name.charAt(0)}
            </div>
            <span className="text-xs font-bold" style={{ color: palette.text }}>
              {student.name}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex items-center justify-between w-full px-2 mb-1">
              {monthlyBest.map((m, i) => (
                <span key={i} className="text-[11px] font-bold" style={{ color: palette.text }}>
                  {m.best}회
                </span>
              ))}
            </div>
            <Sparkline points={monthlyBest.map((m) => m.best)} width={CARD_WIDTH - 60} height={90} color={palette.accent} />
            <div className="flex items-center justify-between w-full px-2 mt-1">
              {monthlyBest.map((m, i) => (
                <span key={i} className="text-[9px] font-mono" style={{ color: palette.subtext }}>
                  {Number(m.month.slice(5, 7))}월
                </span>
              ))}
            </div>
          </div>
          {monthlyBest.length >= 2 && (
            <div className="flex justify-center mb-2">
              <div
                className="w-20 h-20 rounded-full flex flex-col items-center justify-center text-center"
                style={{ background: palette.accent, color: palette.pillText }}
              >
                <span className="text-base font-black leading-none">
                  {diff >= 0 ? '+' : ''}
                  {diff}회
                </span>
                <span className="text-[9px] font-bold mt-0.5">성장!</span>
              </div>
            </div>
          )}
          <div className="text-center text-[11px] font-bold mb-2" style={{ color: palette.subtext }}>
            꾸준함이 만드는 기록의 차이 ♥
          </div>
        </>
      );
    }

    if (cardType === 'TODAY') {
      if (eventRecords.length === 0) return <EmptyState message="이 종목은 아직 기록이 없어요." />;
      const latest = eventRecords[eventRecords.length - 1];
      const previous = eventRecords.length >= 2 ? eventRecords[eventRecords.length - 2] : null;
      const diff = previous ? latest.count - previous.count : null;
      return (
        <>
          <div className="text-center mb-4">
            <div className="text-xl font-black tracking-tight" style={{ color: palette.text }}>
              <span style={{ color: palette.accent }}>T</span>ODAY&apos;S{' '}
              <span style={{ color: palette.accent }}>R</span>ECORD
            </div>
            <div className="text-[11px] font-bold mt-1" style={{ color: palette.subtext }}>
              오늘도 한 걸음 더
            </div>
          </div>
          <div
            className="flex-1 flex flex-col items-center justify-center gap-2 mx-4 rounded-2xl px-4 py-6"
            style={{ background: palette.chip }}
          >
            <div className="text-sm font-bold" style={{ color: palette.subtext }}>
              {meta.title}
            </div>
            <div className="text-5xl font-black leading-none" style={{ color: palette.text }}>
              {latest.count}
              <span className="text-xl font-black">회</span>
            </div>
            {previous && (
              <div className="text-[11px] font-bold" style={{ color: palette.subtext }}>
                이전 기록 {previous.count}회
              </div>
            )}
            {diff !== null && (
              <div
                className="px-3 py-1 rounded-full text-xs font-black"
                style={{ background: palette.accent, color: palette.pillText }}
              >
                {diff >= 0 ? '+' : ''}
                {diff}회
              </div>
            )}
            {latest.isPersonalBest && (
              <div className="text-[10px] font-black tracking-wide" style={{ color: palette.accent }}>
                NEW PERSONAL BEST!
              </div>
            )}
          </div>
          <div className="text-center mt-3 mb-2">
            <div className="text-sm font-bold" style={{ color: palette.text }}>
              {student.name}
            </div>
            <div className="text-[10px] font-mono font-bold" style={{ color: palette.subtext }}>
              {latest.date}
            </div>
          </div>
        </>
      );
    }

    // MONTHLY_REPORT
    if (thisMonthRecords.length === 0) {
      return <EmptyState message="이번달 이 종목 기록이 아직 없어요." />;
    }
    const monthNum = Number(thisMonthPrefix.slice(5, 7));
    const monthBest = Math.max(...thisMonthRecords.map((r) => r.count));
    const monthFirst = thisMonthRecords[0].count;
    const improvement = monthBest - monthFirst;
    const daysRecorded = new Set(thisMonthRecords.map((r) => r.date)).size;
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-black tracking-wide" style={{ color: palette.accent }}>
            ROPERANK
          </div>
          <Calendar className="w-5 h-5" style={{ color: palette.accent }} />
        </div>
        <div className="mb-1">
          <div className="text-xl font-black tracking-tight" style={{ color: palette.text }}>
            {monthNum}월 REPORT
          </div>
          <div className="text-[11px] font-bold mt-1" style={{ color: palette.subtext }}>
            {student.name}의 {monthNum}월 {meta.title} 리포트
          </div>
        </div>
        <div className="space-y-2 my-3">
          <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: palette.chip }}>
            <span className="text-[11px] font-bold" style={{ color: palette.accent }}>
              최고기록
            </span>
            <span className="text-lg font-black" style={{ color: palette.text }}>
              {monthBest}회
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: palette.chip }}>
            <span className="text-[11px] font-bold" style={{ color: palette.accent }}>
              기록 향상
            </span>
            <span className="text-lg font-black flex items-center gap-1" style={{ color: palette.text }}>
              {improvement >= 0 ? '+' : ''}
              {improvement}회
              <TrendingUp className="w-3.5 h-3.5" style={{ color: palette.accent }} />
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: palette.chip }}>
            <span className="text-[11px] font-bold" style={{ color: palette.accent }}>
              기록한 날
            </span>
            <span className="text-lg font-black" style={{ color: palette.text }}>
              {daysRecorded}일
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-[10px] font-bold self-start mb-1" style={{ color: palette.subtext }}>
            나의 기록 그래프
          </div>
          <Sparkline
            points={thisMonthRecords.map((r) => r.count)}
            width={CARD_WIDTH - 60}
            height={70}
            color={palette.accent}
          />
        </div>
        <div className="text-center text-[11px] font-bold my-2" style={{ color: palette.subtext }}>
          이번 달도 멋지게 성장했어요! ♥
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs grid place-items-start sm:place-items-center p-0 sm:p-6 overflow-y-auto overflow-x-hidden">
      <div className="bg-white sm:border sm:border-slate-200 sm:rounded-3xl w-full max-w-lg min-h-screen sm:min-h-0 p-4 sm:p-5 shadow-2xl relative sm:my-auto overflow-x-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">스토리 공유 카드</h2>
              <p className="text-[11px] text-slate-500 font-medium truncate">인스타 스토리(9:16)로 다운로드할 수 있어요.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card type tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2.5 -mx-1 px-1">
          {CARD_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCardType(t.id)}
              className={`shrink-0 px-3 py-2 rounded-xl text-left transition-all cursor-pointer border ${
                cardType === t.id
                  ? 'bg-[#1B5E20] border-[#1B5E20] text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold whitespace-nowrap">{t.label}</div>
            </button>
          ))}
        </div>

        {/* Palette swatches */}
        <div className="flex items-center gap-2 mb-2.5">
          {(Object.keys(PALETTES) as PaletteKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPaletteKey(key)}
              title={PALETTES[key].label}
              className={`w-8 h-8 rounded-full border-2 shrink-0 cursor-pointer transition-all ${
                paletteKey === key ? 'border-[#1B5E20] scale-110' : 'border-slate-200'
              }`}
              style={{ background: PALETTES[key].swatch }}
            />
          ))}
        </div>

        {/* Event picker -- its own row so a long event title never forces
            the palette row wider than the screen. */}
        {cardType !== 'ABILITY' && eventKeys.length > 0 && (
          <select
            value={selectedEventKey}
            onChange={(e) => setSelectedEventKey(e.target.value)}
            className="w-full mb-3 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {eventKeys.map((k) => (
              <option key={k} value={k}>
                {events[k]?.title || k}
              </option>
            ))}
          </select>
        )}

        {/* Preview */}
        <div className="flex justify-center overflow-x-auto py-3 bg-slate-100 rounded-2xl">
          <div
            ref={cardRef}
            style={{ width: CARD_WIDTH, height: CARD_HEIGHT, background: palette.bg }}
            className="flex flex-col p-4 shadow-lg rounded-xl overflow-hidden shrink-0"
          >
            {renderCardBody()}
            <Footer />
          </div>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading || !canRenderCard}
          className="w-full mt-3 py-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>이미지 다운로드</span>
        </button>
      </div>
    </div>
  );
};
