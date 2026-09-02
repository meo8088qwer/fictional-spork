import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Radio, Copy, Check, Save, Wifi, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Gym } from '../data/api/gyms';
import { Student, EventMeta, JumpRecord } from '../types';
import { BatchRecordEntry } from '../data/api/records';
import { parseClassLabels, studentInClass } from '../lib/classLabels';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface LiveCountEntryProps {
  gym: Gym;
  students: Student[];
  events: Record<string, EventMeta>;
  onBatchSaveRecords: (entries: BatchRecordEntry[]) => Promise<JumpRecord[]>;
  onClose: () => void;
}

function randomSessionId(): string {
  return Math.random().toString(36).slice(2, 8);
}

const ALL_CLASSES = '__ALL__';

export const LiveCountEntry: React.FC<LiveCountEntryProps> = ({
  gym,
  students,
  events,
  onBatchSaveRecords,
  onClose,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const classParam = searchParams.get('class') ?? ALL_CLASSES;
  const eventParam = searchParams.get('event');

  const classOptions = Array.from(
    new Set(students.flatMap((s) => parseClassLabels(s.classLabel)))
  ).sort();
  const eventList = Object.values(events);

  const [pickedClass, setPickedClass] = useState(ALL_CLASSES);
  const [pickedEvent, setPickedEvent] = useState(eventList[0]?.key ?? '');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [linkCopied, setLinkCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const startSession = () => {
    if (!pickedEvent) return;
    setSearchParams({
      view: 'LIVE_COUNT',
      session: randomSessionId(),
      class: pickedClass,
      event: pickedEvent,
    });
  };

  const endSession = () => {
    setCounts({});
    setSaved(false);
    setSearchParams({ view: 'LIVE_COUNT' });
  };

  // Ephemeral by design -- this session lives only in the URL + this
  // broadcast channel, not in the database. A device that joins after
  // counts already started won't see earlier values (no history replay),
  // only what's broadcast from here on -- acceptable for a same-practice,
  // join-at-the-start tool. Persisting a "session" row would be the next
  // step if late-join sync ever becomes a real complaint.
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(`live-count:${gym.id}:${sessionId}`);
    channel
      .on('broadcast', { event: 'count' }, ({ payload }) => {
        setCounts((prev) => ({ ...prev, [payload.studentId]: payload.count }));
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gym.id, sessionId]);

  if (!sessionId || !eventParam) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-900">실시간 측정</h1>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 max-w-md">
          <p className="text-xs text-slate-500 font-medium mb-5 leading-relaxed">
            반과 종목을 선택하고 측정을 시작하면, 같은 계정으로 로그인한 다른 기기(모바일 등)에서 접속 링크로
            들어와 함께 실시간으로 기록을 입력할 수 있어요.
          </p>

          <label className="block text-xs font-bold text-slate-700 mb-1.5">반 선택</label>
          <select
            value={pickedClass}
            onChange={(e) => setPickedClass(e.target.value)}
            className="w-full mb-4 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#66BB6A]"
          >
            <option value={ALL_CLASSES}>전체 (반 구분 없음)</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className="block text-xs font-bold text-slate-700 mb-1.5">종목 선택</label>
          <select
            value={pickedEvent}
            onChange={(e) => setPickedEvent(e.target.value)}
            className="w-full mb-5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#66BB6A]"
          >
            {eventList.map((ev) => (
              <option key={ev.key} value={ev.key}>
                {ev.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!pickedEvent}
            onClick={startSession}
            className="w-full py-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Radio className="w-4 h-4" />
            <span>실시간 측정 시작</span>
          </button>
        </div>
      </div>
    );
  }

  const roster = students.filter((s) => classParam === ALL_CLASSES || studentInClass(s.classLabel, classParam));
  const eventTitle = events[eventParam]?.title ?? eventParam;
  const joinUrl = `${window.location.origin}/admin?view=LIVE_COUNT&session=${sessionId}&class=${encodeURIComponent(
    classParam
  )}&event=${eventParam}`;

  const submitCount = (studentId: string, count: number) => {
    setCounts((prev) => ({ ...prev, [studentId]: count }));
    channelRef.current?.send({ type: 'broadcast', event: 'count', payload: { studentId, count } });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard permission can be denied in some mobile browsers -- the
      // link is still visible in the text box for manual copy.
    }
  };

  const handleSaveAll = async () => {
    const entries: BatchRecordEntry[] = roster
      .filter((s) => (counts[s.id] ?? 0) > 0)
      .map((s) => ({
        studentId: s.id,
        studentName: s.name,
        eventKey: eventParam,
        count: counts[s.id],
        date: new Date().toISOString().slice(0, 10),
      }));
    if (entries.length === 0) return;
    setSaving(true);
    try {
      await onBatchSaveRecords(entries);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const filledCount = roster.filter((s) => (counts[s.id] ?? 0) > 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-[#1B5E20]" />
            실시간 측정 중
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {classParam === ALL_CLASSES ? '전체' : classParam} · {eventTitle}
          </p>
        </div>
        <button
          type="button"
          onClick={endSession}
          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
        >
          세션 종료
        </button>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 mb-4">
        <p className="text-xs font-bold text-slate-700 mb-2">
          다른 기기(모바일 등)에서 아래 링크로 접속하면 같이 입력할 수 있어요 (같은 계정으로 로그인 필요)
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={joinUrl}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 truncate"
          />
          <button
            type="button"
            onClick={copyLink}
            className="shrink-0 px-3 py-2 rounded-lg bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{linkCopied ? '복사됨' : '복사'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden mb-4">
        <div className="divide-y divide-slate-100">
          {roster.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm font-bold text-slate-800 truncate">{s.name}</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={counts[s.id] ?? ''}
                onChange={(e) => submitCount(s.id, Number(e.target.value) || 0)}
                placeholder="0"
                className="w-20 shrink-0 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-sm font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#66BB6A]"
              />
            </div>
          ))}
          {roster.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
              선택한 반에 등록된 수련생이 없어요.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={saving || filledCount === 0}
        onClick={handleSaveAll}
        className="w-full py-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
      >
        <Save className="w-4 h-4" />
        <span>
          {saving ? '저장 중...' : saved ? `저장 완료 (${filledCount}명) · 다시 저장` : `전체 저장 (${filledCount}명)`}
        </span>
      </button>
    </div>
  );
};
