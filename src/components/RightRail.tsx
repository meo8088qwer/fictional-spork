import React from 'react';
import { Student, JumpRecord } from '../types';
import { Users } from 'lucide-react';

interface RightRailProps {
  students: Student[];
  records: JumpRecord[];
  onOpenBatchEntry: () => void;
  onOpenStudentManage: () => void;
}

const MISSING_LIST_LIMIT = 10;

export const RightRail: React.FC<RightRailProps> = ({ students, records, onOpenBatchEntry, onOpenStudentManage }) => {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const recordedThisMonthIds = new Set(
    records.filter((r) => new Date(r.date) >= monthStart).map((r) => r.studentId)
  );
  const missingThisMonth = students
    .filter((s) => !recordedThisMonthIds.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return (
    <div className="w-full lg:w-72 shrink-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-slate-400" />
          미입력 학생
          {missingThisMonth.length > 0 && (
            <span className="text-slate-400 font-medium">({missingThisMonth.length}명)</span>
          )}
        </h3>
        {students.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs text-slate-400 mb-2">등록된 수련생이 없습니다.</p>
            <button
              type="button"
              onClick={onOpenStudentManage}
              className="text-xs font-bold text-[#1B5E20] hover:underline cursor-pointer"
            >
              수련생 추가하러 가기 →
            </button>
          </div>
        ) : missingThisMonth.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">이번 달 전원 측정 완료했습니다!</p>
        ) : (
          <>
            <div className="space-y-2">
              {missingThisMonth.slice(0, MISSING_LIST_LIMIT).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs gap-2">
                  <span className="font-bold text-slate-800 truncate">{s.name}</span>
                  <span className="text-slate-400 shrink-0">{s.grade}</span>
                </div>
              ))}
            </div>
            {missingThisMonth.length > MISSING_LIST_LIMIT && (
              <button
                type="button"
                onClick={onOpenBatchEntry}
                className="mt-3 w-full text-xs font-bold text-[#1B5E20] hover:underline text-center cursor-pointer"
              >
                더 보기 ({missingThisMonth.length - MISSING_LIST_LIMIT}명 더) →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
