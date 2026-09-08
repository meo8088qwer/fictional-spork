import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Award,
  Flame,
  Trophy,
  Eye,
  Star,
  Rocket,
  PartyPopper,
} from 'lucide-react';
import { Student, JumpRecord, EventMeta } from '../types';
import {
  computeGrowthEntries,
  computeNewBestEntries,
  computeGymGrowthTrend,
  computeEventTopThree,
  computeGradeGrowth,
  computeAchievements,
  Achievement,
} from '../lib/dashboardStats';

interface GymDashboardProps {
  students: Student[];
  records: JumpRecord[];
  events: Record<string, EventMeta>;
  onOpenStudentManage: () => void;
}

const RANK_BADGE = [
  'bg-amber-100 text-amber-700',
  'bg-slate-200 text-slate-600',
  'bg-orange-100 text-orange-700',
];

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
        RANK_BADGE[rank - 1] ?? 'bg-slate-100 text-slate-500'
      }`}
    >
      {rank}
    </span>
  );
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="p-1.5 rounded-lg bg-[#E8F5E9] text-[#1B5E20]">
          <Icon className="w-4 h-4" />
        </span>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {subtitle && <p className="text-[11px] text-slate-400 font-medium mb-3">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-xs text-slate-400 font-medium py-6 text-center">{text}</p>;
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <span className="p-2.5 rounded-xl bg-[#E8F5E9] text-[#1B5E20] shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-lg font-black text-slate-900">{value}</p>
          {delta && <span className="text-[11px] font-bold text-emerald-600">{delta}</span>}
        </div>
      </div>
    </div>
  );
}

const ACHIEVEMENT_ICON: Record<Achievement['type'], React.ComponentType<{ className?: string }>> = {
  MILESTONE: Flame,
  NEW_BEST: Award,
  STREAK: Star,
  GROWTH: Rocket,
};

export const GymDashboard: React.FC<GymDashboardProps> = ({
  students,
  records,
  events,
  onOpenStudentManage,
}) => {
  if (students.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
            <LayoutDashboard className="w-5 h-5" />
          </span>
          <h1 className="text-xl font-bold text-slate-900">대시보드</h1>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-10 shadow-sm text-center">
          <p className="text-xs text-slate-500 font-medium mb-3">
            아직 등록된 수련생이 없어요. 수련생을 등록하면 성장 대시보드가 채워져요.
          </p>
          <button
            type="button"
            onClick={onOpenStudentManage}
            className="text-xs font-bold text-[#1B5E20] hover:underline cursor-pointer"
          >
            수련생 등록하러 가기 →
          </button>
        </div>
      </div>
    );
  }

  const growthEntries = computeGrowthEntries(students, records, events);
  const newBestEntries = computeNewBestEntries(students, records, events);
  const growthTrend = computeGymGrowthTrend(records, events);
  const eventTopThree = computeEventTopThree(students, records, events);
  const gradeGrowth = computeGradeGrowth(growthEntries);
  const achievements = computeAchievements(students, records, events);

  const risingEntries = growthEntries
    .filter((e) => e.diff > 0)
    .sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime() || b.diff - a.diff);
  const decliningEntries = growthEntries
    .filter((e) => e.diff < 0)
    .sort((a, b) => a.diff - b.diff);
  const growthChampions = [...growthEntries].sort((a, b) => b.diff - a.diff).filter((e) => e.diff > 0).slice(0, 5);

  const pbStudentCount = new Set(newBestEntries.map((e) => e.student.id)).size;
  const risingStudentCount = new Set(risingEntries.map((e) => e.student.id)).size;

  const latestPoint = growthTrend[growthTrend.length - 1];
  const prevPoint = growthTrend[growthTrend.length - 2];
  const scoreDelta = latestPoint && prevPoint ? Math.round((latestPoint.avgScore - prevPoint.avgScore) * 10) / 10 : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
          <LayoutDashboard className="w-5 h-5" />
        </span>
        <h1 className="text-xl font-bold text-slate-900">관장님을 위한 대시보드</h1>
      </div>
      <p className="text-xs text-slate-400 font-medium mb-5 ml-11">우리 아이들의 오늘도, 더 높은 기록을 향해!</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryTile icon={Users} label="전체 원생" value={`${students.length}명`} />
        <SummaryTile
          icon={TrendingUp}
          label="평균 종합점수"
          value={`${latestPoint?.avgScore.toLocaleString() ?? 0}점`}
          delta={scoreDelta !== 0 ? `${scoreDelta > 0 ? '▲' : '▼'} ${Math.abs(scoreDelta)}점` : undefined}
        />
        <SummaryTile icon={Award} label="PB 갱신" value={`${pbStudentCount}명`} />
        <SummaryTile icon={TrendingUp} label="기록 상승" value={`${risingStudentCount}명`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard icon={Flame} title="이번 측정 성장왕" subtitle="지난 기록보다 가장 많이 성장한 친구들입니다.">
          {growthChampions.length === 0 ? (
            <EmptyRow text="아직 비교할 측정 기록이 2회 이상 쌓인 학생이 없어요." />
          ) : (
            <div className="space-y-2.5">
              {growthChampions.map((entry, i) => (
                <div key={`${entry.student.id}-${entry.eventKey}`} className="flex items-center gap-3 text-xs">
                  <RankBadge rank={i + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate">{entry.student.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{entry.eventTitle}</p>
                  </div>
                  <span className="text-slate-400 font-mono">
                    {entry.previousCount} → {entry.latestCount}
                  </span>
                  <span className="font-black text-emerald-600 shrink-0">+{entry.diff}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard icon={Award} title="개인 최고기록 갱신" subtitle="지금까지의 최고기록을 새롭게 갠 친구들입니다.">
          {newBestEntries.length === 0 ? (
            <EmptyRow text="아직 새로운 개인 최고기록이 없어요." />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {[...newBestEntries]
                .sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime())
                .slice(0, 3)
                .map((entry) => (
                  <div
                    key={`${entry.student.id}-${entry.eventKey}`}
                    className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center"
                  >
                    <p className="text-xs font-bold text-slate-800 truncate">{entry.student.name}</p>
                    <p className="text-lg font-black text-[#1B5E20] my-0.5">{entry.latestCount}</p>
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">
                      NEW BEST
                    </span>
                  </div>
                ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard icon={TrendingUp} title="우리 체육관 성장 추이" subtitle="측정 회차별 평균 종합점수 변화입니다.">
          {growthTrend.length < 2 ? (
            <EmptyRow text="측정 회차가 2회 이상 쌓이면 성장 추이 그래프가 보여요." />
          ) : (
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="roundLabel" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                    itemStyle={{ color: '#1B5E20', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(v: number) => [`${v}점`, '평균 종합점수']}
                  />
                  <Line type="monotone" dataKey="avgScore" stroke="#1B5E20" strokeWidth={3} dot={{ fill: '#1B5E20', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard icon={TrendingUp} title="최근 기록 상승" subtitle="이전 기록 대비 최근 기록이 상승한 친구들입니다.">
          {risingEntries.length === 0 ? (
            <EmptyRow text="아직 상승한 기록이 없어요." />
          ) : (
            <div className="space-y-2.5">
              {risingEntries.slice(0, 5).map((entry) => (
                <div key={`${entry.student.id}-${entry.eventKey}`} className="flex items-center gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate">{entry.student.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{entry.eventTitle}</p>
                  </div>
                  <span className="text-slate-400 font-mono">
                    {entry.previousCount} → {entry.latestCount}
                  </span>
                  <span className="font-black text-emerald-600 shrink-0">+{entry.diff}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard icon={Trophy} title="종목별 TOP 3" subtitle="종목별 최고 기록을 달성한 친구들입니다.">
          {Object.keys(eventTopThree).length === 0 ? (
            <EmptyRow text="아직 측정 기록이 없어요." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(eventTopThree).map(([eventKey, top]) => (
                <div key={eventKey}>
                  <p className="text-[11px] font-bold text-slate-500 mb-1.5 truncate">
                    {events[eventKey]?.shortTitle ?? eventKey}
                  </p>
                  <div className="space-y-1">
                    {top.map((entry, i) => (
                      <div key={entry.student.id} className="flex items-center gap-1.5 text-[11px]">
                        <RankBadge rank={i + 1} />
                        <span className="font-bold text-slate-700 truncate flex-1">{entry.student.name}</span>
                        <span className="font-mono text-slate-400 shrink-0">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard icon={Eye} title="체크해볼 친구" subtitle="최근 기록이 하락한 친구들입니다. 함께 응원해주세요!">
          {decliningEntries.length === 0 ? (
            <EmptyRow text="최근 기록이 하락한 친구가 없어요. 모두 잘하고 있어요!" />
          ) : (
            <div className="space-y-2.5">
              {decliningEntries.slice(0, 5).map((entry) => (
                <div key={`${entry.student.id}-${entry.eventKey}`} className="flex items-center gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate">{entry.student.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{entry.eventTitle}</p>
                  </div>
                  <span className="text-slate-400 font-mono">
                    {entry.previousCount} → {entry.latestCount}
                  </span>
                  <span className="font-black text-rose-500 shrink-0">{entry.diff}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard icon={Users} title="연령별 평균 성장" subtitle="연령대별 평균 기록 상승량을 비교합니다.">
          {gradeGrowth.length === 0 ? (
            <EmptyRow text="아직 비교할 성장 데이터가 없어요." />
          ) : (
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip formatter={(v: number) => [`+${v}개`, '평균 성장']} />
                  <Bar dataKey="avgDiff" fill="#66BB6A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard icon={PartyPopper} title="오늘의 기록 달성" subtitle="멋진 성과를 달성한 친구들을 축하해주세요!">
          {achievements.length === 0 ? (
            <EmptyRow text="아직 특별한 성과가 없어요. 측정을 계속 쌓아보세요!" />
          ) : (
            <div className="space-y-2.5">
              {achievements.map((a, i) => {
                const Icon = ACHIEVEMENT_ICON[a.type];
                return (
                  <div key={`${a.student.id}-${a.eventTitle}-${i}`} className="flex items-center gap-2.5 text-xs">
                    <span className="p-1.5 rounded-lg bg-[#E8F5E9] text-[#1B5E20] shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800">{a.student.name}</span>
                      <span className="text-slate-500"> {a.message}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};
