import React, { useState } from 'react';
import { UserPlus, AlertCircle } from 'lucide-react';
import { Student, GradeGroup } from '../types';
import { GRADE_GROUPS } from '../data/constants';
import { parseRoster } from '../lib/excelHelper';
import { todayLocalDate } from '../lib/dateHelper';
import { PlanLimitError, planLimitMessage } from '../data/api/errors';
import { nextStudentNo } from './AdminBatchEntry';

interface OnboardingRosterProps {
  onAddStudents: (students: Omit<Student, 'id'>[]) => Promise<Student[]>;
  onDone: () => void;
  onOpenStudentManage: () => void;
}

const AVATAR_COLORS = [
  'from-orange-500 to-amber-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-purple-500 to-pink-500',
];

export const OnboardingRoster: React.FC<OnboardingRosterProps> = ({ onAddStudents, onDone, onOpenStudentManage }) => {
  const [text, setText] = useState('');
  const [defaultGrade, setDefaultGrade] = useState<GradeGroup>('초등 3학년');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const rows = parseRoster(text, defaultGrade);

  const handleSubmit = async () => {
    if (rows.length === 0) return;
    setIsSaving(true);
    setError('');
    try {
      const today = todayLocalDate();
      await onAddStudents(
        rows.map((r, i) => ({
          studentNo: nextStudentNo([], i),
          name: r.name,
          grade: r.grade,
          gender: 'M',
          avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
          joinDate: today,
        }))
      );
      onDone();
    } catch (e) {
      setError(e instanceof PlanLimitError ? planLimitMessage(e.code) : '등록 중 오류가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <span className="p-2 rounded-xl bg-[#E8F5E9] text-[#1B5E20]">
          <UserPlus className="w-5 h-5" />
        </span>
        <h1 className="text-xl font-bold text-slate-900">수련생 명단부터 넣어볼까요?</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5 leading-relaxed">
        이름을 한 줄에 한 명씩 붙여넣으면 한 번에 등록돼요. 이름 뒤에 학년을 적으면 같이 들어가요.
        <br />
        엑셀에서 이름·학년 두 칸을 그대로 복사해서 붙여넣어도 돼요.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={'김민수 초3\n이서연 초1\n박지훈 7세\n최유나'}
        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/40 resize-y"
      />

      <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
        학년을 안 적은 학생은
        <select
          value={defaultGrade}
          onChange={(e) => setDefaultGrade(e.target.value as GradeGroup)}
          className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
        >
          {GRADE_GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        로 등록
      </label>

      {rows.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold text-slate-500 mb-2">{rows.length}명 확인됨</div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {rows.map((r) => (
              <span
                key={r.name}
                className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700"
              >
                {r.name} · <span className="text-slate-400">{r.grade}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={rows.length === 0 || isSaving}
        onClick={handleSubmit}
        className="mt-5 w-full py-3.5 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-40 text-white font-bold text-sm shadow-sm cursor-pointer"
      >
        {isSaving ? '등록 중...' : rows.length > 0 ? `${rows.length}명 등록하고 첫 기록 입력하기` : '명단을 붙여넣어 주세요'}
      </button>

      <button
        type="button"
        onClick={onOpenStudentManage}
        className="mt-3 w-full text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
      >
        엑셀 파일로 올리거나 한 명씩 자세히 등록하기 →
      </button>
    </div>
  );
};
