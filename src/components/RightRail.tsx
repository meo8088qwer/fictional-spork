import React from 'react';
import { Student, JumpRecord } from '../types';
import { Trophy } from 'lucide-react';

interface RightRailProps {
  students: Student[];
  records: JumpRecord[];
}

function startOfWeek(): Date {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + ((now.getDay() === 0 ? -6 : 1) - now.getDay()));
  return monday;
}

export const RightRail: React.FC<RightRailProps> = ({ students, records }) => {
  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? '알 수 없음';

  const weekStart = startOfWeek();
  const weeklyBestByStudent = new Map<string, JumpRecord>();
  records.forEach((r) => {
    if (new Date(r.date) < weekStart) return;
    const current = weeklyBestByStudent.get(r.studentId);
    if (!current || r.count > current.count) weeklyBestByStudent.set(r.studentId, r);
  });
  const weeklyTop5 = [...weeklyBestByStudent.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="w-full lg:w-72 shrink-0">
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
                <span className="font-bold text-[#1B5E20] shrink-0">{r.count}회</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
