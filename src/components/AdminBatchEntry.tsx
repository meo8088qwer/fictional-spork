import React, { useState, useRef } from 'react';
import { Student, JumpRecord, EventKey, EventMeta, GradeGroup } from '../types';
import { GRADE_GROUPS } from '../data/constants';
import { getStudentPersonalBest } from '../lib/scoring';
import { PlanLimitError, planLimitMessage } from '../data/api/errors';
import { Gym } from '../data/api/gyms';
import {
  downloadExcelTemplate,
  parseExcelFile,
  ExcelParsedRecord,
  downloadStudentRosterTemplate,
  parseStudentRosterExcelFile,
  ParsedStudentRow,
} from '../lib/excelHelper';
import {
  ClipboardEdit,
  Save,
  UserPlus,
  CheckCircle2,
  Calendar,
  Search,
  Sparkles,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Award,
  PlusCircle,
  RotateCcw,
  Plus,
  Zap,
  Flame,
  Clock,
  Gauge,
  Trophy,
  Footprints,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface AdminBatchEntryProps {
  gym: Gym;
  students: Student[];
  records: JumpRecord[];
  events: Record<string, EventMeta>;
  onBatchSaveRecords: (
    entries: Array<{ studentId: string; studentName: string; eventKey: EventKey; count: number; date: string }>
  ) => Promise<JumpRecord[]>;
  onAddStudent: (newStudent: Omit<Student, 'id'>) => Promise<Student>;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onAddCustomEvent: (eventMeta: EventMeta) => Promise<EventMeta>;
  onDeleteCustomEvent: (eventKey: string) => Promise<void>;
  onResetDefaultEvents: () => Promise<Record<string, EventMeta>>;
  onClose: () => void;
}

export const AdminBatchEntry: React.FC<AdminBatchEntryProps> = ({
  gym,
  students,
  records,
  events,
  onBatchSaveRecords,
  onAddStudent,
  onDeleteStudent,
  onAddCustomEvent,
  onDeleteCustomEvent,
  onResetDefaultEvents,
  onClose,
}) => {
  const eventKeys = Object.keys(events);
  const studentLimit = gym.plan === 'paid' ? 200 : 50;
  const eventLimit = gym.plan === 'paid' ? Infinity : 6;
  const [actionError, setActionError] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'BATCH' | 'EXCEL' | 'EVENTS' | 'STUDENTS'>('BATCH');

  // Batch entry state
  const [selectedEventKey, setSelectedEventKey] = useState<EventKey>(eventKeys[0] || '30s_alternate');
  const [measurementDate, setMeasurementDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map of studentId -> entered jump count
  const [countsMap, setCountsMap] = useState<Record<string, string>>({});
  const [savedSuccessAlert, setSavedSuccessAlert] = useState<boolean>(false);

  // Excel Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState<boolean>(false);
  const [parsedExcelRows, setParsedExcelRows] = useState<ExcelParsedRecord[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [excelError, setExcelError] = useState<string>('');
  const [excelSuccessSummary, setExcelSuccessSummary] = useState<string>('');

  // Student Roster Excel Upload state
  const rosterFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isParsingRosterExcel, setIsParsingRosterExcel] = useState<boolean>(false);
  const [parsedRosterRows, setParsedRosterRows] = useState<ParsedStudentRow[]>([]);
  const [rosterExcelFileName, setRosterExcelFileName] = useState<string>('');
  const [rosterExcelError, setRosterExcelError] = useState<string>('');
  const [rosterSuccessMsg, setRosterSuccessMsg] = useState<string>('');
  const [studentRosterSearch, setStudentRosterSearch] = useState<string>('');
  const [studentRosterGrade, setStudentRosterGrade] = useState<string>('ALL');

  // New Student Modal state
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentGrade, setNewStudentGrade] = useState<GradeGroup>('초등 3학년');
  const [newStudentGender, setNewStudentGender] = useState<'M' | 'F'>('M');

  // New Event Modal state
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventShortTitle, setNewEventShortTitle] = useState<string>('');
  const [newEventTimeSeconds, setNewEventTimeSeconds] = useState<number>(30);
  const [newEventTechnique, setNewEventTechnique] = useState<string>('스피드 자율 기술');
  const [newEventIconName, setNewEventIconName] = useState<string>('Zap');
  const [newEventBenchmarkGood, setNewEventBenchmarkGood] = useState<number>(50);
  const [newEventBenchmarkPro, setNewEventBenchmarkPro] = useState<number>(80);

  // Deletion and Reset Confirm Modal States
  const [eventToDelete, setEventToDelete] = useState<{ key: string; title: string } | null>(null);
  const [showResetEventsConfirm, setShowResetEventsConfirm] = useState<boolean>(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Filter students for batch entry
  const filteredStudents = students.filter((student) => {
    const matchesGrade = gradeFilter === 'ALL' || student.grade === gradeFilter;
    const matchesSearch =
      !searchQuery ||
      student.name.includes(searchQuery) ||
      student.studentNo.includes(searchQuery);
    return matchesGrade && matchesSearch;
  });

  const handleInputChange = (studentId: string, value: string) => {
    setCountsMap((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleQuickAutoFillPBs = () => {
    const newMap: Record<string, string> = { ...countsMap };
    filteredStudents.forEach((student) => {
      const pb = getStudentPersonalBest(records, student.id, selectedEventKey);
      if (pb) {
        newMap[student.id] = String(pb.count);
      }
    });
    setCountsMap(newMap);
  };

  const handleClearAllInputs = () => {
    setCountsMap({});
  };

  const handleSaveBatch = async () => {
    const entriesToSave: Array<{
      studentId: string;
      studentName: string;
      eventKey: EventKey;
      count: number;
      date: string;
    }> = [];

    Object.entries(countsMap).forEach(([studentId, valStr]) => {
      const count = Number(valStr);
      if (valStr && !isNaN(count) && count > 0) {
        const student = students.find((s) => s.id === studentId);
        if (student) {
          entriesToSave.push({
            studentId,
            studentName: student.name,
            eventKey: selectedEventKey,
            count,
            date: measurementDate,
          });
        }
      }
    });

    if (entriesToSave.length === 0) {
      alert('입력된 기록이 없습니다. 수련생 옆의 숫자를 입력해 주세요!');
      return;
    }

    setActionError('');
    try {
      await onBatchSaveRecords(entriesToSave);
      setSavedSuccessAlert(true);
      setTimeout(() => {
        setSavedSuccessAlert(false);
        onClose();
      }, 1200);
    } catch (e) {
      setActionError(e instanceof PlanLimitError ? planLimitMessage(e.code) : '기록 저장 중 오류가 발생했습니다.');
    }
  };

  // Excel File Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setExcelError('');
    setIsParsingExcel(true);

    try {
      const rows = await parseExcelFile(file, events);
      if (rows.length === 0) {
        setExcelError('엑셀 파일에서 유효한 수련생 측정 기록을 찾을 수 없습니다. 양식을 확인해 주세요.');
      } else {
        setParsedExcelRows(rows);
      }
    } catch (err) {
      console.error('Excel parse error:', err);
      setExcelError('엑셀 파일을 읽는 도중 오류가 발생했습니다. 올바른 .xlsx, .xls 파일인지 확인해 주세요.');
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Process and apply Excel import to state
  const handleConfirmExcelImport = async () => {
    if (parsedExcelRows.length === 0) return;

    let newPbCount = 0;
    let maintainedPbCount = 0;
    const createdStudentNames: string[] = [];
    const entriesToSave: Array<{
      studentId: string;
      studentName: string;
      eventKey: EventKey;
      count: number;
      date: string;
    }> = [];

    // Track active student list dynamically during import
    const currentStudentsMap = new Map<string, Student>();
    students.forEach((s) => currentStudentsMap.set(s.name, s));

    setActionError('');
    let stopMessage = '';

    for (const row of parsedExcelRows) {
      let student = currentStudentsMap.get(row.studentName);

      // Auto-create student if not exists
      if (!student) {
        const nextNo = `2026-${String(students.length + createdStudentNames.length + 1).padStart(3, '0')}`;
        const avatarColors = [
          'from-orange-500 to-amber-500',
          'from-blue-500 to-cyan-500',
          'from-emerald-500 to-teal-500',
          'from-purple-500 to-pink-500',
        ];
        const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

        try {
          const newSt = await onAddStudent({
            studentNo: nextNo,
            name: row.studentName,
            grade: row.grade || '초등 3학년',
            gender: 'M',
            avatarColor: randomColor,
            joinDate: row.date,
          });
          currentStudentsMap.set(newSt.name, newSt);
          student = newSt;
          createdStudentNames.push(newSt.name);
        } catch (e) {
          stopMessage =
            (e instanceof PlanLimitError ? planLimitMessage(e.code) : '수련생 등록 중 오류가 발생했습니다.') +
            ` (이후 ${row.studentName}부터의 행은 등록되지 않았습니다.)`;
          break;
        }
      }

      // Check against current personal best
      const previousPb = getStudentPersonalBest(records, student.id, row.eventKey);
      if (!previousPb || row.count > previousPb.count) {
        newPbCount++;
      } else {
        maintainedPbCount++;
      }

      entriesToSave.push({
        studentId: student.id,
        studentName: student.name,
        eventKey: row.eventKey,
        count: row.count,
        date: row.date,
      });
    }

    if (entriesToSave.length > 0) {
      try {
        await onBatchSaveRecords(entriesToSave);
      } catch (e) {
        stopMessage = e instanceof PlanLimitError ? planLimitMessage(e.code) : '기록 저장 중 오류가 발생했습니다.';
      }
    }

    if (stopMessage) {
      setActionError(stopMessage);
    }

    if (entriesToSave.length > 0) {
      let summaryMsg = `🎉 엑셀 기록 총 ${entriesToSave.length}건이 성공적으로 등록되었습니다!`;
      if (newPbCount > 0) summaryMsg += ` (🏆 신기록 갱신: ${newPbCount}건)`;
      if (maintainedPbCount > 0) summaryMsg += ` (🔒 기존 최고기록 안전 유지: ${maintainedPbCount}건)`;
      if (createdStudentNames.length > 0) summaryMsg += ` (👤 신규 수련생 ${createdStudentNames.length}명 자동 생성)`;
      setExcelSuccessSummary(summaryMsg);
    }
    setParsedExcelRows([]);
    setExcelFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Student Roster Excel Upload Handler
  const handleRosterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRosterExcelError('');
    setRosterSuccessMsg('');
    setRosterExcelFileName(file.name);
    setIsParsingRosterExcel(true);

    try {
      const rows = await parseStudentRosterExcelFile(file);
      if (rows.length === 0) {
        setRosterExcelError('엑셀 파일에서 유효한 수련생 명단 정보를 찾을 수 없습니다. 양식을 확인해 주세요.');
        setParsedRosterRows([]);
      } else {
        setParsedRosterRows(rows);
      }
    } catch (err) {
      console.error('Student Roster Excel parse error:', err);
      setRosterExcelError('엑셀 파일을 읽는 중 오류가 발생했습니다. 표준 .xlsx/.xls 양식 파일인지 확인해 주세요.');
      setParsedRosterRows([]);
    } finally {
      setIsParsingRosterExcel(false);
      if (rosterFileInputRef.current) rosterFileInputRef.current.value = '';
    }
  };

  const handleConfirmBatchRosterImport = async () => {
    if (parsedRosterRows.length === 0) return;

    const existingNames = new Set(students.map((s) => s.name.trim()));
    let addedCount = 0;
    let skippedCount = 0;

    const avatarColors = [
      'from-orange-500 to-amber-500',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-purple-500 to-pink-500',
      'from-indigo-500 to-purple-500',
      'from-rose-500 to-red-500',
    ];

    setActionError('');
    let stopMessage = '';

    for (const row of parsedRosterRows) {
      if (existingNames.has(row.name.trim())) {
        skippedCount++;
        continue;
      }

      const nextNo = `2026-${String(students.length + addedCount + 1).padStart(3, '0')}`;
      const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      try {
        await onAddStudent({
          studentNo: nextNo,
          name: row.name.trim(),
          grade: row.grade || '초등 3학년',
          gender: row.gender || 'M',
          avatarColor: randomColor,
          joinDate: new Date().toISOString().split('T')[0],
        });
        existingNames.add(row.name.trim());
        addedCount++;
      } catch (e) {
        stopMessage =
          (e instanceof PlanLimitError ? planLimitMessage(e.code) : '수련생 등록 중 오류가 발생했습니다.') +
          ` (${addedCount}명까지만 등록되었습니다.)`;
        break;
      }
    }

    if (stopMessage) setActionError(stopMessage);

    if (addedCount > 0) {
      let msg = `🎉 총 ${addedCount}명의 수련생이 명단에 새로 등록되었습니다!`;
      if (skippedCount > 0) msg += ` (중복된 수련생 ${skippedCount}명 자동 제외)`;
      setRosterSuccessMsg(msg);
    }
    setParsedRosterRows([]);
    setRosterExcelFileName('');
  };

  const handleCreateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      alert('학생 이름을 입력해 주세요.');
      return;
    }

    const nextNo = `2026-${String(students.length + 1).padStart(3, '0')}`;
    const avatarColors = [
      'from-orange-500 to-amber-500',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-purple-500 to-pink-500',
    ];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    setActionError('');
    try {
      await onAddStudent({
        studentNo: nextNo,
        name: newStudentName.trim(),
        grade: newStudentGrade,
        gender: newStudentGender,
        avatarColor: randomColor,
        joinDate: new Date().toISOString().split('T')[0],
      });
      setNewStudentName('');
      setShowAddStudentModal(false);
      alert('신규 수련생이 등록되었습니다!');
    } catch (err) {
      setActionError(err instanceof PlanLimitError ? planLimitMessage(err.code) : '수련생 등록 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 sm:p-6 mb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80">
              <ClipboardEdit className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-slate-900">
              관리자 전용 기록 일괄 & 엑셀 등록 대시보드
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            체육관 수련생들의 측정 종목 기록을 화면 직접 입력 또는 엑셀파일(.xlsx)로 손쉽게 등록하세요.
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs uppercase tracking-wider font-bold">
          <button
            onClick={() => setActiveSubTab('BATCH')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'BATCH'
                ? 'bg-white text-orange-600 shadow-xs font-black border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardEdit className="w-3.5 h-3.5" />
            <span>📝 직접 일괄 입력</span>
          </button>
          <button
            onClick={() => setActiveSubTab('EXCEL')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'EXCEL'
                ? 'bg-white text-emerald-600 shadow-xs font-black border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>📊 엑셀 대량 등록</span>
          </button>
          <button
            onClick={() => setActiveSubTab('EVENTS')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'EVENTS'
                ? 'bg-white text-indigo-600 shadow-xs font-black border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-indigo-500" />
            <span>🎯 종목 관리 ({eventKeys.length}개)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('STUDENTS')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'STUDENTS'
                ? 'bg-white text-orange-600 shadow-xs font-black border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👥 수련생 명단 ({students.length}명)</span>
          </button>
        </div>
      </div>

      {savedSuccessAlert && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 font-extrabold text-sm flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          <span>기록이 성공적으로 저장되었습니다! 실시간 랭킹보드에 적용됩니다.</span>
        </div>
      )}

      {actionError && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 font-extrabold text-sm flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </span>
          <button
            onClick={() => setActionError('')}
            className="text-rose-700 hover:text-rose-900 text-[11px] font-extrabold underline shrink-0"
          >
            확인
          </button>
        </div>
      )}

      {/* BATCH ENTRY SUB TAB */}
      {activeSubTab === 'BATCH' && (
        <div>
          {/* Personal Best Reassurance Banner */}
          <div className="mb-6 bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-amber-900 font-medium shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-amber-950 block mb-0.5">
                🛡️ 최고 기록(PB) 안전 보존 시스템 안내
              </span>
              <span>
                오늘 입력한 측정 기록이 이전 최고기록보다 낮더라도 (예: 기존 최고 70회, 오늘 측정 65회), 수련생의 최고 기록 70회와 랭킹순위는 안전하게 유지되며 오늘 측정된 65회는 수련생의 성장 이력 그래프에만 기록됩니다.
              </span>
            </div>
          </div>

          {/* Controls: Event Selection & Measurement Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            {/* Event Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. 측정 종목 선택 ({eventKeys.length}개 종목)
              </label>
              <select
                value={selectedEventKey}
                onChange={(e) => setSelectedEventKey(e.target.value as EventKey)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:border-orange-500 shadow-xs"
              >
                {eventKeys.map((key) => {
                  const meta = events[key];
                  return (
                    <option key={key} value={key}>
                      [{meta?.timeSeconds || 30}초] {meta?.title} ({meta?.technique})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                2. 측정 일자
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={measurementDate}
                  onChange={(e) => setMeasurementDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:border-orange-500 shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Filter & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              {/* Grade Filter */}
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none shadow-xs font-semibold"
              >
                <option value="ALL">전체 학년</option>
                {GRADE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름 검색..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none shadow-xs font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleQuickAutoFillPBs}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200/80 transition-all flex items-center gap-1 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>기존 최고기록 불러오기</span>
              </button>
              <button
                type="button"
                onClick={handleClearAllInputs}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all font-semibold"
              >
                전체 초기화
              </button>
            </div>
          </div>

          {/* Student Grid Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 max-h-96 overflow-y-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3">수련생 번호</th>
                  <th className="p-3">이름</th>
                  <th className="p-3">학년/부</th>
                  <th className="p-3">기존 최고기록</th>
                  <th className="p-3 text-right">오늘 측정 기록 (회)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      해당 조건의 수련생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const pb = getStudentPersonalBest(records, student.id, selectedEventKey);
                    const currentVal = countsMap[student.id] || '';

                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-400 font-mono">{student.studentNo}</td>
                        <td className="p-3 font-extrabold text-slate-900 flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${student.avatarColor} text-white font-bold text-[10px] flex items-center justify-center`}
                          >
                            {student.name.substring(0, 1)}
                          </div>
                          <span>{student.name}</span>
                        </td>
                        <td className="p-3 text-slate-500 font-medium">{student.grade}</td>
                        <td className="p-3 text-amber-700 font-bold">
                          {pb ? `${pb.count}회 (${pb.date})` : '기록 없음'}
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={currentVal}
                            onChange={(e) => handleInputChange(student.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const inputs = Array.from(
                                  document.querySelectorAll<HTMLInputElement>('input[type="number"]')
                                );
                                const idx = inputs.indexOf(e.currentTarget);
                                if (idx !== -1 && idx + 1 < inputs.length) {
                                  inputs[idx + 1].focus();
                                }
                              }
                            }}
                            className="w-28 text-right px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-lg text-sm text-orange-600 font-black focus:outline-none shadow-xs"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all border border-slate-200/80"
            >
              닫기 / 랭킹보드로 돌아가기
            </button>

            <button
              onClick={handleSaveBatch}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-md shadow-orange-500/20 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>일괄 기록 저장하기</span>
            </button>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT SUB TAB */}
      {activeSubTab === 'EXCEL' && (
        <div className="space-y-6">
          {/* Step 1: Download Template & Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template Download Card */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-5 rounded-2xl border border-emerald-200/80 shadow-2xs">
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-xs">
                  <Download className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    1. 엑셀 표준 등록 양식 다운로드
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    다양한 종목을 한번에 등록할 수 있는 표준 .xlsx 양식을 다운받으세요.
                  </p>
                </div>
              </div>

              <ul className="text-xs text-slate-600 space-y-1.5 mb-4 pl-1 font-medium">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <strong>종합 종목별 양식:</strong> 한 줄에 수련생 이름과 6개 종목 기록을 함께 작성
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  <strong>필수 항목:</strong> 수련생이름, 학년, 측정일자, 종목별 측정기록(회)
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <strong>학년 간편 입력 지원:</strong> <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-bold">유-6</code>, <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-bold">유-7</code>, <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-bold">초-1</code> ~ <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-bold">초-6</code> 자동 변환
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <strong>자동 등록:</strong> 신규 수련생 이름 입력 시 수련생 명단 자동 생성!
                </li>
              </ul>

              <button
                onClick={() => downloadExcelTemplate(events)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>📥 엑셀 등록 양식 파일 (.xlsx) 다운로드</span>
              </button>
            </div>

            {/* Personal Best Guarantee Card */}
            <div className="bg-gradient-to-br from-amber-50 via-orange-50/30 to-white p-5 rounded-2xl border border-amber-200/80 shadow-2xs">
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    2. 최고 기록(PB) 보호 및 갱신 원칙
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    기록 업로드 시 최고 기록 보존 및 자동 판정이 적용됩니다.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-700 font-medium bg-white/80 p-3 rounded-xl border border-amber-200/60">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">🏆 [신기록 갱신]</span>
                  <span>
                    엑셀의 기록이 기존 최고기록보다 높은 경우 (예: 기존 70회 → 엑셀 75회), <strong>75회로 신기록 갱신</strong>되며 랭킹 상승!
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-700 font-bold shrink-0">🔒 [최고기록 유지]</span>
                  <span>
                    엑셀의 기록이 기존 최고기록보다 낮거나 같은 경우 (예: 기존 70회 → 엑셀 65회), <strong>기존 70회 기록 유지</strong>! (65회는 측정 이력에 저장)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Success Summary Banner */}
          {excelSuccessSummary && (
            <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl text-xs font-bold text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{excelSuccessSummary}</span>
              </div>
              <button
                onClick={() => setExcelSuccessSummary('')}
                className="text-emerald-700 hover:text-emerald-900 text-[11px] font-extrabold underline shrink-0"
              >
                확인
              </button>
            </div>
          )}

          {/* Step 2: Upload Zone */}
          <div className="bg-slate-50/80 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition-all">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
              id="excel-file-input"
            />
            <label
              htmlFor="excel-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-emerald-600">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-black text-slate-900 block">
                  작성된 엑셀 파일(.xlsx, .xls, .csv) 선택 또는 드래그앤드롭
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  다운로드받은 양식에 수련생 기록을 기재한 뒤 업로드해주세요.
                </span>
              </div>
            </label>

            {excelFileName && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>선택된 파일: {excelFileName}</span>
              </div>
            )}

            {isParsingExcel && (
              <p className="text-xs text-orange-600 font-bold mt-2 animate-pulse">
                ⏳ 엑셀 파일을 분석하고 수련생 기록 데이터를 검증하는 중입니다...
              </p>
            )}

            {excelError && (
              <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-bold flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{excelError}</span>
              </div>
            )}
          </div>

          {/* Step 3: Parsed Data Preview & Confirmation */}
          {parsedExcelRows.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>엑셀 데이터 검증 결과 (총 {parsedExcelRows.length}건 감지)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    아래 항목을 확인한 후 [엑셀 데이터 최종 등록] 버튼을 눌러주세요.
                  </p>
                </div>

                <button
                  onClick={handleConfirmExcelImport}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>🚀 엑셀 데이터 최종 등록하기 ({parsedExcelRows.length}건)</span>
                </button>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2.5">수련생 이름</th>
                      <th className="p-2.5">학년</th>
                      <th className="p-2.5">측정 종목</th>
                      <th className="p-2.5">측정일자</th>
                      <th className="p-2.5 text-right">엑셀 기록(회)</th>
                      <th className="p-2.5 text-right">기존 PB(회)</th>
                      <th className="p-2.5 text-center">적용 판정</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedExcelRows.map((row, idx) => {
                      const matchedStudent = students.find((s) => s.name === row.studentName);
                      const eventMeta = events[row.eventKey];
                      const previousPb = matchedStudent
                        ? getStudentPersonalBest(records, matchedStudent.id, row.eventKey)
                        : null;

                      const isNewPB = !previousPb || row.count > previousPb.count;
                      const isNewStudent = !matchedStudent;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 font-medium text-slate-800">
                          <td className="p-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{row.studentName}</span>
                            {isNewStudent && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-extrabold">
                                👤 신규
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-500">{row.grade || matchedStudent?.grade || '미지정'}</td>
                          <td className="p-2.5 font-semibold text-slate-800">
                            {eventMeta ? eventMeta.title : row.eventKey}
                          </td>
                          <td className="p-2.5 font-mono text-slate-500 text-[11px]">{row.date}</td>
                          <td className="p-2.5 text-right font-black text-orange-600 text-sm">
                            {row.count}회
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-600">
                            {previousPb ? `${previousPb.count}회` : '-'}
                          </td>
                          <td className="p-2.5 text-center">
                            {isNewPB ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] border border-emerald-300">
                                <Award className="w-3 h-3 text-emerald-600" />
                                🏆 신기록 갱신
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
                                🔒 최고기록 ({previousPb?.count}회) 유지
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EVENT MANAGEMENT SUB TAB */}
      {activeSubTab === 'EVENTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-indigo-500" />
                <span>체육관 맞춤 측정 종목 설정 ({eventKeys.length}개 종목)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                체육관 커리큘럼에 맞는 종목을 직접 추가하거나 삭제할 수 있습니다. 엑셀 양식 및 타이머에도 즉시 연동됩니다.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowResetEventsConfirm(true)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>기본 종목 초기화</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddEventModal(true)}
                disabled={eventKeys.length >= eventLimit}
                title={eventKeys.length >= eventLimit ? planLimitMessage('FREE_PLAN_EVENT_LIMIT_REACHED') : undefined}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>➕ 새 측정 종목 추가{eventLimit !== Infinity ? ` (${eventKeys.length}/${eventLimit})` : ''}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {eventKeys.map((key) => {
              const meta = events[key];
              return (
                <div
                  key={key}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {meta.timeSeconds}초 측정
                      </span>
                      {meta.isCustom ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                          직접 추가됨
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">기본 제공</span>
                      )}
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900 mb-1">{meta.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mb-2">{meta.technique}</p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl font-mono">
                      <span>표준 기준: 우수 {meta.benchmarkGood ?? 50}회 / 프로 {meta.benchmarkPro ?? 80}회</span>
                    </div>
                  </div>

                  {meta.isCustom && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setEventToDelete({ key, title: meta.title })}
                        className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>종목 삭제</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STUDENT ROSTER MANAGEMENT SUB TAB */}
      {activeSubTab === 'STUDENTS' && (
        <div className="space-y-6">
          {/* Top Banner & Excel Roster Upload Card */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs">
                    📁 엑셀 명단 일괄 등록
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    전체 수련생 명단(80~100명+) 엑셀 한 번에 올리기
                  </h3>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  처음 이용 시 80명 이상의 수련생 명단을 일일이 입력할 필요 없이, 엑셀 파일 하나로 빠르게 일괄 등록할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => downloadStudentRosterTemplate(gym.name)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>📥 수련생 명단 엑셀 양식 다운로드</span>
              </button>
            </div>

            {/* Roster File Upload Area */}
            <div className="bg-white border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl p-4 text-center transition-colors">
              <input
                ref={rosterFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleRosterFileChange}
                className="hidden"
                id="roster-excel-input"
              />

              <label
                htmlFor="roster-excel-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-7 h-7 text-emerald-600 animate-bounce" />
                <span className="text-xs font-extrabold text-slate-800">
                  수련생 명단 엑셀 파일 선택 또는 드래그앤드롭 (.xlsx / .csv)
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  '수련생이름', '학년', '성별' 열이 포함된 엑셀 파일
                </span>
              </label>
            </div>

            {isParsingRosterExcel && (
              <div className="mt-3 text-center text-xs text-emerald-700 font-bold flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                <span>수련생 명단 엑셀 분석 중...</span>
              </div>
            )}

            {rosterExcelError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rosterExcelError}</span>
              </div>
            )}

            {rosterSuccessMsg && (
              <div className="mt-3 p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-extrabold flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span>{rosterSuccessMsg}</span>
              </div>
            )}

            {/* Parsed Roster Preview Table */}
            {parsedRosterRows.length > 0 && (
              <div className="mt-4 pt-4 border-t border-emerald-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800">
                      📋 업로드된 명단 미리보기 ({parsedRosterRows.length}명 감지됨)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {parsedRosterRows.filter((r) => !students.some((s) => s.name.trim() === r.name.trim())).length}명 신규 등록 예정
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParsedRosterRows([])}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmBatchRosterImport}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>수련생 명단 최종 일괄 등록 실행 ({parsedRosterRows.length}명)</span>
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-2.5 w-12 text-center">#</th>
                        <th className="p-2.5">수련생 이름</th>
                        <th className="p-2.5">학년 / 부서</th>
                        <th className="p-2.5">성별</th>
                        <th className="p-2.5 text-right">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {parsedRosterRows.map((row, idx) => {
                        const isExisting = students.some((s) => s.name.trim() === row.name.trim());
                        return (
                          <tr key={idx} className={isExisting ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                            <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{row.name}</td>
                            <td className="p-2.5 text-slate-600">{row.grade}</td>
                            <td className="p-2.5 text-slate-600">{row.gender === 'M' ? '남학생' : '여학생'}</td>
                            <td className="p-2.5 text-right">
                              {isExisting ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  기존 수련생 (중복제외)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  ✨ 신규 추가
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Existing Roster List Header & Controls */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>체육관 등록 수련생 목록</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
                    총 {students.length}명
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  disabled={students.length >= studentLimit}
                  title={students.length >= studentLimit ? planLimitMessage('STUDENT_LIMIT_REACHED') : undefined}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>개별 수련생 직접 추가 ({students.length}/{studentLimit})</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="수련생 이름 검색..."
                  value={studentRosterSearch}
                  onChange={(e) => setStudentRosterSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={studentRosterGrade}
                onChange={(e) => setStudentRosterGrade(e.target.value)}
                className="w-full sm:w-44 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="ALL">전체 학년/부서</option>
                {GRADE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pt-2">
              {students
                .filter((student) => {
                  const matchesSearch = student.name.toLowerCase().includes(studentRosterSearch.toLowerCase());
                  const matchesGrade = studentRosterGrade === 'ALL' || student.grade === studentRosterGrade;
                  return matchesSearch && matchesGrade;
                })
                .map((student) => (
                  <div
                    key={student.id}
                    className="bg-slate-50/80 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${student.avatarColor} text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs`}
                      >
                        {student.name.substring(0, 1)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">{student.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {student.grade} • {student.studentNo}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStudentToDelete(student)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="수련생 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              🎯 커스텀 줄넘기 종목 추가
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              우리 체육관만의 특화 종목을 새로 등록하세요.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newEventTitle.trim()) {
                  alert('종목명을 입력해 주세요.');
                  return;
                }

                const customKey = `event_${Date.now()}`;
                const newMeta: EventMeta = {
                  key: customKey,
                  title: newEventTitle.trim(),
                  shortTitle: newEventShortTitle.trim() || newEventTitle.trim().substring(0, 5),
                  timeSeconds: Number(newEventTimeSeconds) || 30,
                  technique: newEventTechnique.trim() || '자율 기술',
                  description: newEventTechnique.trim() || `${newEventTitle.trim()} 스피드 측정`,
                  iconName: newEventIconName || 'Zap',
                  isCustom: true,
                  benchmarkGood: Number(newEventBenchmarkGood) || 50,
                  benchmarkPro: Number(newEventBenchmarkPro) || 80,
                };

                setActionError('');
                try {
                  await onAddCustomEvent(newMeta);
                  setShowAddEventModal(false);
                  setNewEventTitle('');
                  setNewEventShortTitle('');
                  alert(`'${newMeta.title}' 종목이 새로 추가되었습니다!`);
                } catch (err) {
                  setActionError(
                    err instanceof PlanLimitError ? planLimitMessage(err.code) : '종목 추가 중 오류가 발생했습니다.'
                  );
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-bold mb-1">종목 풀네임 (예: 2중 3단계 30초)</label>
                <input
                  type="text"
                  required
                  placeholder="예: 2중 3단계 30초"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">축약 표기 (예: 2중3단계)</label>
                  <input
                    type="text"
                    placeholder="예: 2중3단계"
                    value={newEventShortTitle}
                    onChange={(e) => setNewEventShortTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">측정 시간 (초)</label>
                  <input
                    type="number"
                    min="5"
                    max="600"
                    value={newEventTimeSeconds}
                    onChange={(e) => setNewEventTimeSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">기술 / 설명</label>
                <input
                  type="text"
                  placeholder="예: 이중 뛰기 변형 동작"
                  value={newEventTechnique}
                  onChange={(e) => setNewEventTechnique(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">우수 뱃지 기준 (회)</label>
                  <input
                    type="number"
                    value={newEventBenchmarkGood}
                    onChange={(e) => setNewEventBenchmarkGood(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">프로 뱃지 기준 (회)</label>
                  <input
                    type="number"
                    value={newEventBenchmarkPro}
                    onChange={(e) => setNewEventBenchmarkPro(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-xs"
                >
                  종목 추가 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              신규 수련생 등록
            </h3>
            <form onSubmit={handleCreateStudentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">학생 이름</label>
                <input
                  type="text"
                  required
                  placeholder="예: 김민우"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">학년 / 부서</label>
                <select
                  value={newStudentGrade}
                  onChange={(e) => setNewStudentGrade(e.target.value as GradeGroup)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none font-medium"
                >
                  {GRADE_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">성별</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-slate-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={newStudentGender === 'M'}
                      onChange={() => setNewStudentGender('M')}
                    />
                    <span>남학생</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={newStudentGender === 'F'}
                      onChange={() => setNewStudentGender('F')}
                    />
                    <span>여학생</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white font-black hover:bg-orange-600 shadow-xs"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Custom Event Delete Modal */}
      <ConfirmModal
        isOpen={!!eventToDelete}
        title="측정 종목 삭제"
        message={`'${eventToDelete?.title}' 커스텀 종목을 삭제하시겠습니까?\n이 종목으로 기록된 측정 데이터는 유지되지만 랭킹 및 탭 목록에서 제외됩니다.`}
        confirmText="종목 삭제"
        variant="danger"
        onConfirm={() => {
          if (eventToDelete) {
            const key = eventToDelete.key;
            setEventToDelete(null);
            setActionError('');
            onDeleteCustomEvent(key).catch(() => setActionError('종목 삭제 중 오류가 발생했습니다.'));
          }
        }}
        onClose={() => setEventToDelete(null)}
      />

      {/* Confirm Reset Events Modal */}
      <ConfirmModal
        isOpen={showResetEventsConfirm}
        title="기본 종목 초기화"
        message="기본 6개 종목으로 재설정하시겠습니까?\n직접 추가한 커스텀 종목 설정이 초기화됩니다."
        confirmText="초기화 실행"
        variant="warning"
        onConfirm={() => {
          setShowResetEventsConfirm(false);
          setActionError('');
          onResetDefaultEvents().catch(() => setActionError('종목 초기화 중 오류가 발생했습니다.'));
        }}
        onClose={() => setShowResetEventsConfirm(false)}
      />

      {/* Confirm Delete Student Modal */}
      <ConfirmModal
        isOpen={!!studentToDelete}
        title="수련생 삭제"
        message={`'${studentToDelete?.name}' 수련생을 명단에서 정말 삭제하시겠습니까?\n등록된 측정 기록도 함께 삭제되며 이 작업은 취소할 수 없습니다.`}
        confirmText="수련생 삭제"
        variant="danger"
        onConfirm={() => {
          if (studentToDelete) {
            const studentId = studentToDelete.id;
            setStudentToDelete(null);
            setActionError('');
            onDeleteStudent(studentId).catch(() => setActionError('수련생 삭제 중 오류가 발생했습니다.'));
          }
        }}
        onClose={() => setStudentToDelete(null)}
      />
    </div>
  );
};

