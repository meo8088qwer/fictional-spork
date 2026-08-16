import React from 'react';
import { Student, JumpRecord, EventMeta } from '../types';
import { RefreshCw, Trophy } from 'lucide-react';

interface RightRailProps {
  students: Student[];
  records: JumpRecord[];
  events: Record<string, EventMeta>;
  onRefresh: () => void;
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function startOfWeek(): Date {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + ((now.getDay() === 0 ? -6 : 1) - now.getDay()));
  return monday;
}

export const RightRail: React.FC<RightRailProps> = ({ students, records, events, onRefresh }) => {
  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? '알 수 없음';

  const recentRecords = [...records]
    .sort((a, b) => new Date(b.createdAt ?? b.date).getTime() - new Date(a.createdAt ?? a.date).getTime())
    .slice(0, 5);

  const weekStart = startOfWeek();
  const weeklyBestByStudent = new Map<string, JumpRecord>();
  records.forEach((r) => {
    if (new Date(r.date) < weekStart) return;
    const current = weeklyBestByStudent.get(r.studentId);
    if (!current || r.count > current.count) weeklyBestByStudent.set(r.studentId, r);
  });
  const weeklyTop5 = [...weeklyBestByStudent.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="w-full lg:w-72 shrink-0 space-y-4">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">실시간 기록 현황</h3>
          <button
            type="button"
            onClick={onRefresh}
            title="새로고침"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        {recentRecords.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">아직 등록된 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2.5">
            {recentRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{studentName(r.studentId)}</div>
                  <div className="text-slate-400 truncate">{events[r.eventKey]?.shortTitle ?? r.eventKey}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-emerald-600">{r.count}회</div>
                  <div className="text-slate-400">{timeAgo(r.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-slate-400" />
          이번 주 기록 TOP 5
        </h3>
        {weeklyTop5.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">이번 주 기록이 아직 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {weeklyTop5.map((r, idx) => (
              <div key={r.id} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-800 truncate">{studentName(r.studentId)}</span>
                </div>
                <span className="font-bold text-emerald-600 shrink-0">{r.count}회</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
