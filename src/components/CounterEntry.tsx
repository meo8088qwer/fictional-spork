import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus, RotateCcw, Pencil, ChevronLeft, ChevronRight, Save, X, PartyPopper } from 'lucide-react';
import { Student, EventMeta } from '../types';
import { digitsOnly } from '../lib/numberInput';

interface CounterEntryProps {
  roster: Student[];
  eventMeta: EventMeta;
  classLabel: string;
  onSaveOne: (studentId: string, count: number) => Promise<void>;
  onExit: () => void;
}

// One student, one giant tap counter -- meant for events where a coach can
// realistically tap once per rep (endurance/technique counts), not a
// 30-second speed test with 100+ reps. Saves each student's count the
// moment "기록 저장" is tapped and immediately advances, so a mid-roster
// interruption only loses the one student in progress, not the whole batch
// (unlike the multi-device typed-entry mode, which only saves at the end).
export const CounterEntry: React.FC<CounterEntryProps> = ({ roster, eventMeta, classLabel, onSaveOne, onExit }) => {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const student = roster[index];
  const isDone = index >= roster.length;

  const startEditing = () => {
    setEditValue(String(count));
    setIsEditing(true);
  };

  const commitEditing = () => {
    const parsed = Math.max(0, Math.round(Number(editValue)) || 0);
    setCount(parsed);
    setIsEditing(false);
  };

  const goTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= roster.length) return;
    setIndex(nextIndex);
    setCount(0);
    setIsEditing(false);
  };

  const handleSaveAndNext = async () => {
    if (count > 0) {
      setSaving(true);
      try {
        await onSaveOne(student.id, count);
        setSavedCount((n) => n + 1);
      } finally {
        setSaving(false);
      }
    }
    if (index + 1 < roster.length) {
      setIndex(index + 1);
      setCount(0);
    } else {
      setIndex(roster.length);
    }
  };

  if (isDone) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center max-w-lg">
        <PartyPopper className="w-10 h-10 text-[#1B5E20] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">전원 측정 완료했어요!</h2>
        <p className="text-xs text-slate-500 font-medium mb-6">
          {roster.length}명 중 {savedCount}명의 기록을 저장했어요.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="px-5 py-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-sm cursor-pointer"
        >
          설정으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold text-slate-400">
          {index + 1} / {roster.length}명
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index >= roster.length - 1}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onExit}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{student.name}</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {student.grade} · {classLabel}
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-[#E8F5E9] text-[#1B5E20] font-bold text-xs shrink-0">
          {eventMeta.shortTitle ?? eventMeta.title}
        </span>
      </div>

      <div className="text-center mb-6">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(digitsOnly(e.target.value))}
            onBlur={commitEditing}
            onKeyDown={(e) => e.key === 'Enter' && commitEditing()}
            className="w-full text-center text-7xl font-black text-slate-900 bg-slate-50 border-2 border-[#66BB6A] rounded-2xl py-4 focus:outline-none"
          />
        ) : (
          <span className="text-8xl font-black text-slate-900 tabular-nums">{count}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="w-full py-8 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 active:scale-[0.98] text-white font-black text-3xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none mb-3"
      >
        <Plus className="w-7 h-7" />
        <span>1</span>
      </button>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setCount((c) => Math.max(0, c - 1))}
          className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-1 cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />1
        </button>
        <button
          type="button"
          onClick={() => setCount((c) => c + 10)}
          className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />10
        </button>
        <button
          type="button"
          onClick={startEditing}
          className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-1 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
          직접입력
        </button>
        <button
          type="button"
          onClick={() => setCount(0)}
          className="py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm flex items-center justify-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          초기화
        </button>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={handleSaveAndNext}
        className="w-full py-3.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
      >
        <Save className="w-4 h-4" />
        <span>{saving ? '저장 중...' : count > 0 ? `현재 기록 저장 (${count}회)` : '건너뛰기'}</span>
      </button>
    </div>
  );
};
