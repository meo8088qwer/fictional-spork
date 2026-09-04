import React from 'react';
import { LayoutDashboard, Users, ClipboardList, UserPlus, Award, Crown } from 'lucide-react';
import { Student, JumpRecord, EventMeta } from '../types';
import { parseClassLabels, studentInClass } from '../lib/classLabels';
import { getLeaderboardData } from '../lib/scoring';

interface GymDashboardProps {
  students: Student[];
  records: JumpRecord[];
  events: Record<string, EventMeta>;
  onOpenStudentManage: () => void;
}

const UNASSIGNED_CLASS = '미배정';

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <span className="p-2.5 rounded-xl bg-slate-100 text-slate-600 shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
        <p className="text-lg font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export const GymDashboard: React.FC<GymDashboardProps> = ({
  students,
  records,
  events,
  onOpenStudentManage,
}) => {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const recordsThisMonth = records.filter((r) => new Date(r.date) >= monthStart);
  const newStudentsThisMonth = students.filter((s) => s.joinDate && new Date(s.joinDate) >= monthStart);
  const newPbRecordsThisMonth = recordsThisMonth.filter((r) => r.isPersonalBest);

  const classNames = Array.from(new Set(students.flatMap((s) => parseClassLabels(s.classLabel)))).sort();
  const hasUnassigned = students.some((s) => parseClassLabels(s.classLabel).length === 0);
  const classBuckets = hasUnassigned ? [...classNames, UNASSIGNED_CLASS] : classNames;

  const classStats = classBuckets.map((className) => {
    const classStudents =
      className === UNASSIGNED_CLASS
        ? students.filter((s) => parseClassLabels(s.classLabel).length === 0)
        : students.filter((s) => studentInClass(s.classLabel, className));
    const classStudentIds = new Set(classStudents.map((s) => s.id));
    const classPbRecordsThisMonth = newPbRecordsThisMonth.filter((r) => classStudentIds.has(r.studentId));
    const studentsWithPbThisMonth = new Set(classPbRecordsThisMonth.map((r) => r.studentId)).size;
    const participationRate = classStudents.length > 0 ? studentsWithPbThisMonth / classStudents.length : 0;

    const leaderboard = getLeaderboardData(classStudents, records, 'OVERALL', 'ALL', '', events);
    const topStudent = leaderboard[0] ?? null;
    const avgScore =
      leaderboard.length > 0
        ? Math.round(leaderboard.reduce((sum, item) => sum + item.overallScore, 0) / leaderboard.length)
        : 0;

    return {
      className,
      studentCount: classStudents.length,
      studentsWithPbThisMonth,
      participationRate,
      topStudent,
      avgScore,
    };
  });

  classStats.sort((a, b) => b.participationRate - a.participationRate || b.studentCount - a.studentCount);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
          <LayoutDashboard className="w-5 h-5" />
        </span>
        <h1 className="text-xl font-bold text-slate-900">대시보드</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryTile icon={Users} label="전체 수련생" value={`${students.length}명`} />
        <SummaryTile icon={UserPlus} label="이번달 신규 등록" value={`${newStudentsThisMonth.length}명`} />
        <SummaryTile icon={ClipboardList} label="이번달 측정 건수" value={`${recordsThisMonth.length}건`} />
        <SummaryTile icon={Award} label="이번달 신기록 갱신" value={`${newPbRecordsThisMonth.length}건`} />
      </div>

      <h2 className="text-sm font-bold text-slate-900 mb-3">반별 현황</h2>

      {classBuckets.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm text-center">
          <p className="text-xs text-slate-500 font-medium mb-3">
            아직 학생들에게 반이 배정되지 않았어요. 반을 배정하면 반별 현황을 볼 수 있어요.
          </p>
          <button
            type="button"
            onClick={onOpenStudentManage}
            className="text-xs font-bold text-[#1B5E20] hover:underline cursor-pointer"
          >
            수련생 관리에서 반 배정하러 가기 →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {classStats.map((stat) => (
            <div key={stat.className} className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-900">{stat.className}</span>
                <span className="text-[11px] font-bold text-slate-500">{stat.studentCount}명</span>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-500 font-medium">이번달 신기록 갱신</span>
                  <span className="text-[11px] font-bold text-slate-700">
                    {stat.studentsWithPbThisMonth}/{stat.studentCount}명
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1B5E20] rounded-full"
                    style={{ width: `${Math.round(stat.participationRate * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-medium">평균 종합점수</span>
                <span className="font-bold text-slate-800">{stat.avgScore.toLocaleString()}점</span>
              </div>

              {stat.topStudent && (
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-slate-500 font-medium">반 1위</span>
                  <span className="font-bold text-slate-800 truncate">{stat.topStudent.student.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
