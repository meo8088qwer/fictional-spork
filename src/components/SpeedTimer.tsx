import React, { useState, useEffect, useRef } from 'react';
import { Student, EventKey, EventMeta } from '../types';
import { Timer, Play, RotateCcw, Save, Zap, Volume2, Footprints, Sparkles } from 'lucide-react';

interface SpeedTimerProps {
  students: Student[];
  events: Record<string, EventMeta>;
  onSaveRecord: (entry: {
    studentId: string;
    studentName: string;
    eventKey: EventKey;
    count: number;
    date: string;
  }) => void;
  onClose: () => void;
}

export const SpeedTimer: React.FC<SpeedTimerProps> = ({
  students,
  events,
  onSaveRecord,
  onClose,
}) => {
  const eventKeys = Object.keys(events);
  const [selectedEventKey, setSelectedEventKey] = useState<EventKey>(eventKeys[0] || '30s_alternate');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );

  const activeEventMeta = events[selectedEventKey] || events[eventKeys[0]];
  const durationSeconds = activeEventMeta?.timeSeconds || 30;
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [countdownPhase, setCountdownPhase] = useState<'READY' | 'COUNTDOWN' | 'RUNNING' | 'FINISHED'>('READY');
  const [prepSeconds, setPrepSeconds] = useState<number>(3);
  const [jumpCount, setJumpCount] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // When event changes, update default time
  useEffect(() => {
    if (activeEventMeta) {
      setTimeLeft(activeEventMeta.timeSeconds);
    }
    setJumpCount(0);
    setCountdownPhase('READY');
    setIsRunning(false);
  }, [selectedEventKey]);

  // Audio Beep generator using Web Audio API
  const playBeep = (freq = 440, duration = 0.15) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log('Audio Context beep disabled', e);
    }
  };

  // Timer Tick Logic
  useEffect(() => {
    if (countdownPhase === 'COUNTDOWN') {
      if (prepSeconds > 0) {
        playBeep(600, 0.1);
        const prepTimer = setTimeout(() => {
          setPrepSeconds((prev) => prev - 1);
        }, 1000);
        return () => clearTimeout(prepTimer);
      } else {
        // Countdown finished, Start Jump Rope Measurement!
        playBeep(1000, 0.4);
        setCountdownPhase('RUNNING');
        setIsRunning(true);
      }
    }

    if (countdownPhase === 'RUNNING' && isRunning) {
      if (timeLeft > 0) {
        timerRef.current = setTimeout(() => {
          setTimeLeft((prev) => {
            if (prev <= 5 && prev > 1) {
              playBeep(500, 0.1);
            }
            return prev - 1;
          });
        }, 1000);
        return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
        };
      } else {
        // Time Over!
        playBeep(1200, 0.6);
        setIsRunning(false);
        setCountdownPhase('FINISHED');
      }
    }
  }, [countdownPhase, prepSeconds, isRunning, timeLeft]);

  // Keyboard spacebar counter listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (countdownPhase === 'RUNNING') {
          setJumpCount((prev) => prev + 1);
          playBeep(800, 0.05);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [countdownPhase]);

  const handleStartMeasurement = () => {
    setPrepSeconds(3);
    setJumpCount(0);
    setTimeLeft(activeEventMeta?.timeSeconds || 30);
    setCountdownPhase('COUNTDOWN');
  };

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsRunning(false);
    setCountdownPhase('READY');
    setTimeLeft(activeEventMeta?.timeSeconds || 30);
    setJumpCount(0);
  };

  const handleSaveToRecord = () => {
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) {
      alert('수련생을 선택해 주세요.');
      return;
    }

    if (jumpCount <= 0) {
      alert('점프 횟수가 0회입니다. 카운트 후 저장해 주세요.');
      return;
    }

    onSaveRecord({
      studentId: student.id,
      studentName: student.name,
      eventKey: selectedEventKey,
      count: jumpCount,
      date: new Date().toISOString().split('T')[0],
    });

    alert(`${student.name} 수련생의 ${activeEventMeta?.title || '종목'} (${jumpCount}회) 기록이 등록되었습니다!`);
    onClose();
  };

  const activeStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm mb-8 max-w-2xl mx-auto text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80">
            <Timer className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              스피드 타이머 & 실시간 카운터
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              30초 및 10초 스피드 측정용 음성 신호음 타이머 및 터치/스페이스바 카운터입니다.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-xs font-bold text-slate-400 hover:text-slate-600"
        >
          닫기 ✕
        </button>
      </div>

      {/* Select Student & Event */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 text-xs">
        <div>
          <label className="block text-slate-700 font-bold mb-1">측정 대상 수련생</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-orange-500 shadow-xs"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.grade})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-700 font-bold mb-1">종목 선택</label>
          <select
            value={selectedEventKey}
            onChange={(e) => setSelectedEventKey(e.target.value as EventKey)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-orange-500 shadow-xs"
          >
            {eventKeys.map((key) => {
              const meta = events[key];
              return (
                <option key={key} value={key}>
                  [{meta?.timeSeconds || 30}초] {meta?.title || key}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Main Display Box */}
      <div className="bg-slate-50/80 border-2 border-orange-200 rounded-2xl p-8 text-center relative overflow-hidden mb-6">
        {/* Countdown Phase Badge */}
        {countdownPhase === 'COUNTDOWN' && (
          <div className="text-6xl font-black text-amber-500 animate-pulse my-4">
            준비... {prepSeconds}
          </div>
        )}

        {countdownPhase === 'RUNNING' && (
          <div>
            <div className="text-xs font-bold text-orange-600 tracking-wider uppercase mb-1">
              REMAINING TIME
            </div>
            <div className="text-6xl sm:text-7xl font-black text-orange-600 font-mono tracking-tight my-2">
              {timeLeft.toString().padStart(2, '0')}
              <span className="text-xl text-orange-500 font-bold ml-1">SEC</span>
            </div>
          </div>
        )}

        {countdownPhase === 'FINISHED' && (
          <div className="my-2">
            <span className="px-3.5 py-1 rounded-full bg-amber-100 text-amber-800 font-black text-xs border border-amber-300">
              🎉 측정 완료!
            </span>
            <div className="text-5xl font-black text-slate-900 mt-3">
              최종 기록: <span className="text-orange-600 italic">{jumpCount}</span>회
            </div>
          </div>
        )}

        {countdownPhase === 'READY' && (
          <div className="my-4">
            <div className="text-5xl font-black text-slate-800 font-mono">
              {durationSeconds}.00 SEC
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              [측정 시작] 버튼을 누르면 3초 카운트다운 후 측정이 시작됩니다.
            </p>
          </div>
        )}

        {/* Big Tap Counter Button */}
        {countdownPhase === 'RUNNING' && (
          <div className="mt-6">
            <button
              onClick={() => {
                setJumpCount((prev) => prev + 1);
                playBeep(800, 0.05);
              }}
              className="w-full py-8 bg-gradient-to-tr from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 rounded-2xl shadow-md text-white font-black transition-all flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="text-4xl sm:text-5xl">{jumpCount} 회</div>
              <span className="text-xs text-orange-100 mt-2 font-bold">
                👆 화면 터치 또는 [SpaceBar] 로 카운트!
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-200/80"
        >
          <RotateCcw className="w-4 h-4" />
          <span>리셋</span>
        </button>

        {countdownPhase === 'READY' && (
          <button
            onClick={handleStartMeasurement}
            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>측정 시작 (3초 카운트다운)</span>
          </button>
        )}

        {countdownPhase === 'FINISHED' && (
          <button
            onClick={handleSaveToRecord}
            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{activeStudent?.name} 학생 기록에 저장</span>
          </button>
        )}
      </div>
    </div>
  );
};
