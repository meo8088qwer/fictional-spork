import React, { useState } from 'react';
import { Student, JumpRecord, EventKey, EventMeta } from '../types';
import { getStudentPersonalBest } from '../lib/scoring';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Trophy, TrendingUp, Calendar, Printer, X, Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface StudentProfileModalProps {
  student: Student;
  records: JumpRecord[];
  events: Record<string, EventMeta>;
  isAdmin?: boolean;
  onDeleteStudent?: (studentId: string) => void;
  onDeleteRecord?: (recordId: string) => void;
  onOpenCertificate?: (student: Student) => void;
  onClose: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  records,
  events,
  isAdmin = false,
  onDeleteStudent,
  onDeleteRecord,
  onOpenCertificate,
  onClose,
}) => {
  const eventKeys = Object.keys(events);
  const [selectedEventKey, setSelectedEventKey] = useState<EventKey>(eventKeys[0] || '30s_alternate');
  const [showStudentDeleteConfirm, setShowStudentDeleteConfirm] = useState<boolean>(false);
  const [recordToDelete, setRecordToDelete] = useState<JumpRecord | null>(null);

  const selectedMeta = events[selectedEventKey] || events[eventKeys[0]];

  // Student's records for selected event sorted by date
  const studentEventRecords = records
    .filter((r) => r.studentId === student.id && r.eventKey === selectedEventKey)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const chartData = studentEventRecords.map((r) => ({
    date: r.date.substring(5), // MM-DD
    count: r.count,
  }));

  // Monthly best -- e.g. 6월 112개 / 7월 127개 / 8월 142개, with the
  // headline % change from the first month to the latest.
  const monthlyBestMap = new Map<string, number>();
  for (const r of studentEventRecords) {
    const month = r.date.slice(0, 7); // YYYY-MM
    monthlyBestMap.set(month, Math.max(monthlyBestMap.get(month) ?? 0, r.count));
  }
  const monthlyBest = [...monthlyBestMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, best]) => ({ label: `${Number(month.slice(5, 7))}월`, best }));
  const firstMonth = monthlyBest[0];
  const lastMonth = monthlyBest[monthlyBest.length - 1];
  const growthPercent =
    monthlyBest.length >= 2 && firstMonth.best > 0
      ? (((lastMonth.best - firstMonth.best) / firstMonth.best) * 100).toFixed(1)
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs grid place-items-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Student Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${student.avatarColor} text-white font-black text-2xl flex items-center justify-center shadow-xs shrink-0`}
            >
              {student.name.substring(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
                <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {student.grade}
                </span>
              </div>
              {isAdmin && (
                <p className="text-xs text-slate-500 mt-1 font-mono font-medium">
                  수련생 번호: {student.studentNo} • 입관일: {student.joinDate}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onDeleteStudent && (
              <button
                type="button"
                onClick={() => setShowStudentDeleteConfirm(true)}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>수련생 삭제</span>
              </button>
            )}

            {onOpenCertificate && (
              <button
                type="button"
                onClick={() => onOpenCertificate(student)}
                className="px-4 py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>기록 인증 상장 발급</span>
              </button>
            )}
          </div>
        </div>

        {/* Grid of Personal Bests across 6 Events */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-slate-400" />
            종목별 최고 기록 현황
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {eventKeys.map((key) => {
              const meta = events[key];
              const pb = getStudentPersonalBest(records, student.id, key);

              return (
                <div
                  key={key}
                  onClick={() => setSelectedEventKey(key)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedEventKey === key
                      ? 'bg-[#1B5E20] border-[#1B5E20]'
                      : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold truncate flex items-center gap-1 ${
                      selectedEventKey === key ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    <span>{meta?.shortTitle || key}</span>
                    {meta?.isCustom && (
                      <span
                        className={`text-[9px] px-1 rounded ${
                          selectedEventKey === key ? 'bg-white/15 text-white' : 'text-slate-600 bg-slate-200'
                        }`}
                      >
                        커스텀
                      </span>
                    )}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${selectedEventKey === key ? 'text-white' : 'text-slate-900'}`}>
                    {pb ? `${pb.count}회` : '-'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                    {pb ? pb.date : '기록 없음'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Growth Line Chart (Recharts) */}
        <div className="mb-6 bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              [{selectedMeta?.title || '선택 종목'}] 성장 기록 그래프
            </h4>
            <span className="text-[10px] text-slate-400 font-mono font-medium">
              총 {studentEventRecords.length}회 측정
            </span>
          </div>

          <div className="h-44 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                선택한 종목의 측정 기록이 없습니다.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#1B5E20', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#1B5E20"
                    strokeWidth={3}
                    dot={{ fill: '#1B5E20', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monthly Growth Summary */}
        {monthlyBest.length >= 2 && (
          <div className="mb-6 bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                {student.name} 학생의 월별 성장
              </h4>
              {growthPercent && (
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    Number(growthPercent) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {monthlyBest.length}개월 동안 {Number(growthPercent) >= 0 ? '+' : ''}
                  {growthPercent}% {Number(growthPercent) >= 0 ? '향상' : '변화'}
                </span>
              )}
            </div>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBest}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip formatter={(v: number) => [`${v}회`, '월간 최고기록']} />
                  <Bar dataKey="best" fill="#1B5E20" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detailed Measurement Records History Table */}
        <div className="bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>[{selectedMeta?.title || '선택 종목'}] 상세 기록 이력 관리</span>
            </h4>
            {onDeleteRecord && (
              <span className="text-[10px] text-slate-400 font-mono font-medium">
                잘못 입력된 기록은 즉시 삭제할 수 있습니다
              </span>
            )}
          </div>

          {studentEventRecords.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 font-medium">
              측정된 기록 이력이 없습니다.
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                    <th className="p-2 pl-3">측정 날짜</th>
                    <th className="p-2 text-right">기록 (횟수)</th>
                    {onDeleteRecord && <th className="p-2 pr-3 text-right">기록 삭제</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {studentEventRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="p-2 pl-3 font-mono text-slate-600">{r.date}</td>
                      <td className="p-2 text-right font-bold text-slate-900">{r.count}회</td>
                      {onDeleteRecord && (
                        <td className="p-2 pr-3 text-right">
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(r)}
                            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="기록 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Student Delete Modal */}
      <ConfirmModal
        isOpen={showStudentDeleteConfirm}
        title="수련생 삭제"
        message={`'${student.name}' 수련생을 명단 및 모든 측정 기록에서 정말 삭제하시겠습니까?\n이 작업은 취소할 수 없습니다.`}
        confirmText="수련생 완전 삭제"
        variant="danger"
        onConfirm={() => {
          if (onDeleteStudent) {
            onDeleteStudent(student.id);
            onClose();
          }
        }}
        onClose={() => setShowStudentDeleteConfirm(false)}
      />

      {/* Confirm Record Delete Modal */}
      <ConfirmModal
        isOpen={!!recordToDelete}
        title="측정 기록 삭제"
        message={`'${recordToDelete?.date}' 측정 기록 (${recordToDelete?.count}회)을 삭제하시겠습니까?`}
        confirmText="기록 삭제"
        variant="danger"
        onConfirm={() => {
          if (recordToDelete && onDeleteRecord) {
            onDeleteRecord(recordToDelete.id);
            setRecordToDelete(null);
          }
        }}
        onClose={() => setRecordToDelete(null)}
      />
    </div>
  );
};
