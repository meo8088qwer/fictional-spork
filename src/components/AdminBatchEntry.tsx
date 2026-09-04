import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Student, JumpRecord, EventKey, EventMeta, GradeGroup } from '../types';
import { GRADE_GROUPS } from '../data/constants';
import { getStudentPersonalBest } from '../lib/scoring';
import { todayLocalDate } from '../lib/dateHelper';
import { parseClassLabels, studentInClass, normalizeClassLabels } from '../lib/classLabels';
import { PlanLimitError, PlanLimitCode, planLimitMessage } from '../data/api/errors';
import { Gym } from '../data/api/gyms';

// Sentinel dropdown value for "show every event column at once" -- never a
// real event key (those come from the events table), so it can share the
// same <select> as the real event keys without colliding.
const ALL_EVENTS_KEY = '__ALL__';

// Sentinel class-filter value for "students with no 반 assigned at all" --
// never a real class name (those come from parsing classLabel), so it can
// share the same <select> as real class names without colliding.
const UNASSIGNED_CLASS_KEY = '__UNASSIGNED__';

// Next student_no for the current year, based on the highest existing
// suffix rather than the current headcount -- headcount undercounts once
// any student has ever been deleted, which collided with a still-existing
// higher-numbered student and tripped the DB's unique(gym_id, student_no).
function nextStudentNo(students: Student[], extraOffset: number): string {
  const prefix = `${new Date().getFullYear()}-`;
  const maxExisting = students.reduce((max, s) => {
    if (!s.studentNo.startsWith(prefix)) return max;
    const n = parseInt(s.studentNo.slice(prefix.length), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `${prefix}${String(maxExisting + extraOffset + 1).padStart(3, '0')}`;
}
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
  ListChecks,
  Users,
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Lock,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { UpgradeModal } from './UpgradeModal';
import { ClassLabelsField } from './ClassLabelsField';

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
  onUpdateStudentClass: (args: { studentId: string; classLabel: string | null }) => Promise<Student>;
  onAddCustomEvent: (eventMeta: EventMeta) => Promise<EventMeta>;
  onDeleteCustomEvent: (eventKey: string) => Promise<void>;
  onResetDefaultEvents: () => Promise<Record<string, EventMeta>>;
  onUpdateEventBenchmarks: (args: {
    key: string;
    benchmarkGood: number;
    benchmarkPro: number;
  }) => Promise<EventMeta>;
  onDeleteRecord: (recordId: string) => Promise<void>;
  onClose: (lastEventKey?: EventKey) => void;
  onNavigateToPricing: () => void;
  // Which sub-section to land on -- the sidebar now links directly to
  // 종목 관리/수련생 관리 instead of them being buttons inside this dashboard.
  initialSubTab?: 'BATCH' | 'EVENTS' | 'STUDENTS';
}

export const AdminBatchEntry: React.FC<AdminBatchEntryProps> = ({
  gym,
  students,
  records,
  events,
  onBatchSaveRecords,
  onAddStudent,
  onDeleteStudent,
  onUpdateStudentClass,
  onAddCustomEvent,
  onDeleteCustomEvent,
  onResetDefaultEvents,
  onUpdateEventBenchmarks,
  onDeleteRecord,
  onClose,
  onNavigateToPricing,
  initialSubTab = 'BATCH',
}) => {
  const eventKeys = Object.keys(events);
  const studentLimit = gym.plan === 'pro' ? Infinity : gym.plan === 'basic' ? 150 : 50;
  // Basic can add up to 5 custom events on top of the 6 defaults (11 total);
  // pro is uncapped.
  const eventLimit = gym.plan === 'pro' ? Infinity : gym.plan === 'basic' ? 11 : 6;
  const [actionError, setActionError] = useState<string>('');
  const [planLimitPopup, setPlanLimitPopup] = useState<PlanLimitCode | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'BATCH' | 'EVENTS' | 'STUDENTS'>(initialSubTab);

  // Re-sync when navigating here from a different sidebar link while this
  // component stays mounted (e.g. 종목 관리 -> 수련생 관리 without a remount).
  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // Batch entry state
  const [selectedEventKey, setSelectedEventKey] = useState<EventKey>(ALL_EVENTS_KEY);
  // Drop-down normally picks exactly one event column to enter at a time --
  // coaches asked for the table to only show the one event they're
  // currently measuring. "전체" (all events) is a sentinel value on the
  // same dropdown that restores the old side-by-side view of every event.
  const visibleEventKeys = selectedEventKey === ALL_EVENTS_KEY ? eventKeys : [selectedEventKey];
  // Sorting/labels that only make sense for one concrete event fall back to
  // the first real event while "전체" is selected.
  const pbSortEventKey = selectedEventKey === ALL_EVENTS_KEY ? eventKeys[0] : selectedEventKey;
  const [measurementDate, setMeasurementDate] = useState<string>(todayLocalDate());
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const classOptions = Array.from(
    new Set(students.flatMap((s) => parseClassLabels(s.classLabel)))
  ).sort();

  // Map of eventKey -> studentId -> entered jump count. Nested by event so
  // the table can take input for several events per student in one pass
  // instead of forcing a dropdown switch + re-save per event.
  const [countsMap, setCountsMap] = useState<Record<string, Record<string, string>>>({});
  const [savedSuccessAlert, setSavedSuccessAlert] = useState<boolean>(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState<boolean>(false);

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
  const [studentRosterClass, setStudentRosterClass] = useState<string>('ALL');
  // Click a roster card's 반 badge to edit it inline -- studentId being
  // edited, and the chip set being built up while that editor is open.
  const [editingClassStudentId, setEditingClassStudentId] = useState<string | null>(null);
  const [classDraft, setClassDraft] = useState<string>('');

  // New Student Modal state
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentGrade, setNewStudentGrade] = useState<GradeGroup>('초등 3학년');
  const [newStudentGender, setNewStudentGender] = useState<'M' | 'F'>('M');
  const [newStudentClassLabel, setNewStudentClassLabel] = useState<string>('');

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

  // Benchmark ("표준 기준") inline edit -- gyms differ on what counts as
  // 우수/프로 for their own students, so the DEFAULT_EVENTS seed values are
  // just a starting point every gym can override per event.
  const [editingBenchmarkKey, setEditingBenchmarkKey] = useState<string | null>(null);
  const [benchmarkGoodDraft, setBenchmarkGoodDraft] = useState<string>('');
  const [benchmarkProDraft, setBenchmarkProDraft] = useState<string>('');

  const handleSaveBenchmarks = async (key: string) => {
    const good = Number(benchmarkGoodDraft);
    const pro = Number(benchmarkProDraft);
    if (!Number.isFinite(good) || !Number.isFinite(pro) || good < 0 || pro < 0) return;
    await onUpdateEventBenchmarks({ key, benchmarkGood: good, benchmarkPro: pro });
    setEditingBenchmarkKey(null);
  };

  // Filter students for batch entry, sorted to match a printed roster order
  const filteredStudents = students
    .filter((student) => {
      const matchesGrade = gradeFilter === 'ALL' || student.grade === gradeFilter;
      const matchesClass =
        classFilter === 'ALL' ||
        (classFilter === UNASSIGNED_CLASS_KEY
          ? parseClassLabels(student.classLabel).length === 0
          : studentInClass(student.classLabel, classFilter));
      const matchesSearch =
        !searchQuery ||
        student.name.includes(searchQuery) ||
        student.studentNo.includes(searchQuery);
      return matchesGrade && matchesClass && matchesSearch;
    })
    .sort((a, b) => a.studentNo.localeCompare(b.studentNo));

  // Column sort for the batch entry table -- click a header to sort by it,
  // click again to flip direction. Unset = keep the default 번호 order above.
  const [sortKey, setSortKey] = useState<'name' | 'grade' | 'pb' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (key: 'name' | 'grade' | 'pb') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedRows = filteredStudents.map((student) => ({
    student,
    pb: getStudentPersonalBest(records, student.id, pbSortEventKey),
  }));
  if (sortKey) {
    sortedRows.sort((a, b) => {
      const cmp =
        sortKey === 'name'
          ? a.student.name.localeCompare(b.student.name)
          : sortKey === 'grade'
          ? a.student.grade.localeCompare(b.student.grade)
          : (a.pb?.count ?? -1) - (b.pb?.count ?? -1);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const handleInputChange = (eventKey: EventKey, studentId: string, value: string) => {
    setCountsMap((prev) => ({ ...prev, [eventKey]: { ...prev[eventKey], [studentId]: value } }));
  };

  const handleQuickAutoFillPBs = () => {
    const newMap: Record<string, Record<string, string>> = { ...countsMap };
    visibleEventKeys.forEach((eventKey) => {
      const eventMap = { ...newMap[eventKey] };
      filteredStudents.forEach((student) => {
        const pb = getStudentPersonalBest(records, student.id, eventKey);
        if (pb) {
          eventMap[student.id] = String(pb.count);
        }
      });
      newMap[eventKey] = eventMap;
    });
    setCountsMap(newMap);
  };

  const handleClearAllInputs = () => {
    setCountsMap({});
  };

  const buildBatchEntries = () => {
    const entriesToSave: Array<{
      studentId: string;
      studentName: string;
      eventKey: EventKey;
      count: number;
      date: string;
    }> = [];

    Object.entries(countsMap).forEach(([eventKey, studentCounts]) => {
      Object.entries(studentCounts).forEach(([studentId, valStr]) => {
        const count = Number(valStr);
        if (valStr && !isNaN(count) && count > 0) {
          const student = students.find((s) => s.id === studentId);
          if (student) {
            entriesToSave.push({
              studentId,
              studentName: student.name,
              eventKey,
              count,
              date: measurementDate,
            });
          }
        }
      });
    });

    return entriesToSave;
  };

  // Undo list for this page: today's records, most recent first. Derived
  // straight from `records` (not a separate local log) so it's already
  // populated on page load and stays in sync after save/delete for free.
  const recentSaves = useMemo(
    () =>
      records
        .filter((r) => r.date === measurementDate)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        .slice(0, 20),
    [records, measurementDate]
  );

  // Coaches kept saving to the wrong event by mis-clicking the dropdown, so
  // this only opens a confirm naming the event -- the actual save happens
  // in handleSaveBatch once they confirm.
  const handleSaveBatchClick = () => {
    if (buildBatchEntries().length === 0) {
      alert('입력된 기록이 없습니다. 수련생 옆의 숫자를 입력해 주세요!');
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleSaveBatch = async () => {
    const entriesToSave = buildBatchEntries();
    if (entriesToSave.length === 0) return;

    setActionError('');
    try {
      await onBatchSaveRecords(entriesToSave);
      setSavedSuccessAlert(true);
      setCountsMap({});
      setTimeout(() => setSavedSuccessAlert(false), 1200);
      // Stay on the 기록관리 page instead of bouncing to the leaderboard --
      // coaches enter several batches in a row and kept losing their place.
    } catch (e) {
      setActionError(e instanceof PlanLimitError ? planLimitMessage(e.code) : '기록 저장 중 오류가 발생했습니다.');
    }
  };

  const handleUndoSave = async (record: JumpRecord) => {
    await onDeleteRecord(record.id);
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
        const nextNo = nextStudentNo(students, createdStudentNames.length);
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
      let summaryMsg = `엑셀 기록 총 ${entriesToSave.length}건이 성공적으로 등록되었습니다!`;
      if (newPbCount > 0) summaryMsg += ` (신기록 갱신: ${newPbCount}건)`;
      if (maintainedPbCount > 0) summaryMsg += ` (기존 최고기록 안전 유지: ${maintainedPbCount}건)`;
      if (createdStudentNames.length > 0) summaryMsg += ` (신규 수련생 ${createdStudentNames.length}명 자동 생성)`;
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

    const existingByName = new Map(students.map((s) => [s.name.trim(), s]));
    let addedCount = 0;
    let updatedClassCount = 0;
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
      const existing = existingByName.get(row.name.trim());
      if (existing) {
        // Existing student: only touch their 반 if the sheet gives one and
        // it's actually different -- name/grade/gender aren't re-imported.
        if (row.classLabel && normalizeClassLabels(row.classLabel) !== normalizeClassLabels(existing.classLabel)) {
          try {
            await onUpdateStudentClass({ studentId: existing.id, classLabel: normalizeClassLabels(row.classLabel) });
            updatedClassCount++;
          } catch {
            // best-effort; keep going with the rest of the sheet
          }
        } else {
          skippedCount++;
        }
        continue;
      }

      const nextNo = nextStudentNo(students, addedCount);
      const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      try {
        const created = await onAddStudent({
          studentNo: nextNo,
          name: row.name.trim(),
          grade: row.grade || '초등 3학년',
          gender: row.gender || 'M',
          avatarColor: randomColor,
          joinDate: todayLocalDate(),
          classLabel: row.classLabel,
        });
        existingByName.set(created.name.trim(), created);
        addedCount++;
      } catch (e) {
        stopMessage =
          (e instanceof PlanLimitError ? planLimitMessage(e.code) : '수련생 등록 중 오류가 발생했습니다.') +
          ` (${addedCount}명까지만 등록되었습니다.)`;
        break;
      }
    }

    if (stopMessage) setActionError(stopMessage);

    if (addedCount > 0 || updatedClassCount > 0) {
      let msg = '';
      if (addedCount > 0) msg += `${addedCount}명 신규 등록`;
      if (updatedClassCount > 0) msg += `${msg ? ', ' : ''}${updatedClassCount}명 반 정보 갱신`;
      msg += '되었습니다!';
      if (skippedCount > 0) msg += ` (변경사항 없는 기존 수련생 ${skippedCount}명 제외)`;
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

    const nextNo = nextStudentNo(students, 0);
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
        joinDate: todayLocalDate(),
        classLabel: normalizeClassLabels(newStudentClassLabel) || undefined,
      });
      setNewStudentName('');
      setNewStudentClassLabel('');
      setShowAddStudentModal(false);
      alert('신규 수련생이 등록되었습니다!');
    } catch (err) {
      if (err instanceof PlanLimitError) {
        setShowAddStudentModal(false);
        setPlanLimitPopup(err.code);
      } else {
        setActionError('수련생 등록 중 오류가 발생했습니다.');
      }
    }
  };

  const handleSaveClassLabel = async (studentId: string, rawValue: string) => {
    const normalized = normalizeClassLabels(rawValue);
    await onUpdateStudentClass({ studentId, classLabel: normalized || null });
    setEditingClassStudentId(null);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 sm:p-6 mb-8">
      {/* Header Bar -- title matches whichever of the 3 subtabs is active,
          instead of one long generic sentence repeated on all of them */}
      <div className="border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
            {activeSubTab === 'EVENTS' ? (
              <ListChecks className="w-5 h-5" />
            ) : activeSubTab === 'STUDENTS' ? (
              <Users className="w-5 h-5" />
            ) : (
              <ClipboardEdit className="w-5 h-5" />
            )}
          </span>
          <h2 className="text-lg font-bold text-slate-900">
            {activeSubTab === 'EVENTS' ? '종목 관리' : activeSubTab === 'STUDENTS' ? '수련생 관리' : '기록 관리'}
          </h2>
        </div>
      </div>

      {savedSuccessAlert && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 font-bold text-sm flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          <span>기록이 성공적으로 저장되었습니다! 실시간 랭킹보드에 적용됩니다.</span>
        </div>
      )}

      {actionError && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 font-bold text-sm flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </span>
          <button
            onClick={() => setActionError('')}
            className="text-rose-700 hover:text-rose-900 text-[11px] font-bold underline shrink-0"
          >
            확인
          </button>
        </div>
      )}

      {/* BATCH ENTRY SUB TAB -- excel bulk upload lives on this same page
          now instead of behind a separate tab */}
      {activeSubTab === 'BATCH' && (
        <div className="space-y-8">
          {/* Excel bulk record upload (merged in from the old separate tab) */}
          <div>
            <div className="space-y-6">

          {/* 3 steps in one row: template download, PB rule, upload -- was a
              2-col grid of long-form cards above a separate full-width drop
              zone, which read as more steps than it is. One glance across a
              single row is easier to take in. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Template Download */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0">
                  <Download className="w-4 h-4" />
                </span>
                <h3 className="text-xs font-bold text-slate-900">1. 엑셀 양식 다운로드</h3>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mb-3 flex-1">
                이름·학년·종목별 기록을 한 줄에 작성하는 표준 양식이에요. 명단에 없는 이름은 자동으로 새 수련생으로 등록돼요.
              </p>
              <button
                onClick={() => downloadExcelTemplate(events, students, records)}
                className="w-full py-2 px-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>양식 다운로드</span>
              </button>
            </div>

            {/* 2. Personal Best Guarantee */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h3 className="text-xs font-bold text-slate-900">2. 최고기록(PB) 보호</h3>
              </div>
              <p className="text-[11px] text-slate-600 font-medium flex-1">
                기존 기록보다 <strong className="text-emerald-700">높으면 신기록으로 갱신</strong>되고, 낮거나
                같으면 <strong className="text-slate-800">기존 최고기록을 그대로 유지</strong>해요. (낮은 값도
                측정 이력에는 저장됩니다)
              </p>
            </div>

            {/* 3. Upload */}
            {gym.plan === 'free' ? (
              <button
                type="button"
                onClick={() => setPlanLimitPopup('BASIC_FEATURE_LOCKED')}
                className="bg-slate-50/80 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <Lock className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-900">3. 엑셀 업로드 (베이직 이상)</span>
                <span className="text-[11px] text-slate-500 font-medium">눌러서 업그레이드하면 바로 사용할 수 있어요.</span>
              </button>
            ) : (
              <div className="bg-slate-50/80 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-4 text-center transition-all flex flex-col">
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
                  className="cursor-pointer flex flex-col items-center justify-center gap-1.5 flex-1"
                >
                  <Upload className="w-5 h-5 text-slate-600" />
                  <span className="text-xs font-bold text-slate-900">3. 엑셀 업로드</span>
                  <span className="text-[11px] text-slate-500 font-medium">작성한 파일을 선택하거나 드래그앤드롭하세요</span>
                </label>

                {excelFileName && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold self-center">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate max-w-40">{excelFileName}</span>
                  </div>
                )}

                {isParsingExcel && (
                  <p className="text-[11px] text-slate-500 font-bold mt-2 animate-pulse">엑셀 분석 중...</p>
                )}

                {excelError && (
                  <div className="mt-2 bg-rose-50 border border-rose-200 rounded-lg p-2 text-[11px] text-rose-700 font-bold flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{excelError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Success Summary Banner */}
          {excelSuccessSummary && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs font-bold text-emerald-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{excelSuccessSummary}</span>
              </div>
              <button
                onClick={() => setExcelSuccessSummary('')}
                className="text-emerald-700 hover:text-emerald-900 text-[11px] font-bold underline shrink-0"
              >
                확인
              </button>
            </div>
          )}

          {/* Step 3: Parsed Data Preview & Confirmation */}
          {parsedExcelRows.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>엑셀 데이터 검증 결과 (총 {parsedExcelRows.length}건 감지)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    아래 항목을 확인한 후 [엑셀 데이터 최종 등록] 버튼을 눌러주세요.
                  </p>
                </div>

                <button
                  onClick={handleConfirmExcelImport}
                  className="px-5 py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-xs transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>엑셀 데이터 최종 등록하기 ({parsedExcelRows.length}건)</span>
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
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                신규
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-500">{row.grade || matchedStudent?.grade || '미지정'}</td>
                          <td className="p-2.5 font-semibold text-slate-800">
                            {eventMeta ? eventMeta.title : row.eventKey}
                          </td>
                          <td className="p-2.5 font-mono text-slate-500 text-[11px]">{row.date}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900 text-sm">
                            {row.count}회
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-600">
                            {previousPb ? `${previousPb.count}회` : '-'}
                          </td>
                          <td className="p-2.5 text-center">
                            {isNewPB ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                <Award className="w-3 h-3 text-emerald-600" />
                                신기록 갱신
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                                최고기록 ({previousPb?.count}회) 유지
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
          </div>

          {/* Direct manual entry (previously its own tab) */}
          <div>
          {/* Recent Saves + Undo -- today's records for this gym, shown only
              on this page. Always rendered (not just after a save) so
              coaches always know where to find it. */}
          <div className="mb-6 bg-white border border-slate-200/80 rounded-2xl p-3.5">
            <div className="mb-2">
              <span className="text-xs font-bold text-slate-700">오늘 저장된 기록 (되돌리기)</span>
            </div>
            {recentSaves.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-1">오늘 저장된 기록이 없습니다.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {recentSaves.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <span className="font-semibold text-slate-700 truncate">
                      {r.studentName} · {events[r.eventKey]?.title ?? r.eventKey} · {r.count}회
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUndoSave(r)}
                      className="shrink-0 text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>되돌리기</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Controls: Event Selection & Measurement Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            {/* Event Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. 측정할 종목 선택
              </label>
              <select
                value={selectedEventKey}
                onChange={(e) => setSelectedEventKey(e.target.value as EventKey)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#66BB6A] shadow-xs"
              >
                <option value={ALL_EVENTS_KEY}>전체 (모든 종목 한 번에 보기)</option>
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
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#66BB6A] shadow-xs"
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

              {/* Class/Session Filter -- only shown once the gym assigns one */}
              {classOptions.length > 0 && (
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none shadow-xs font-semibold"
                >
                  <option value="ALL">전체 반</option>
                  <option value={UNASSIGNED_CLASS_KEY}>미배정</option>
                  {classOptions.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              )}

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

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleQuickAutoFillPBs}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>기존 최고기록 불러오기</span>
              </button>
              <button
                type="button"
                onClick={() => toggleSort('pb')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all font-bold flex items-center gap-1"
              >
                <span>최고기록순 정렬 ({events[pbSortEventKey]?.shortTitle ?? pbSortEventKey})</span>
                {sortKey === 'pb' ? (
                  sortDir === 'asc' ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                )}
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

          {/* Student Grid Table -- one input column per visible event, so
              the 6 default events (and one extra custom event, if picked
              above) can all be entered in the same pass. */}
          <div className="bg-white border border-slate-200 rounded-xl mb-6 max-h-[720px] overflow-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3">수련생 번호</th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-1 uppercase font-bold cursor-pointer hover:text-slate-800"
                    >
                      <span>이름</span>
                      {sortKey === 'name' ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('grade')}
                      className="flex items-center gap-1 uppercase font-bold cursor-pointer hover:text-slate-800"
                    >
                      <span>학년/부</span>
                      {sortKey === 'grade' ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </button>
                  </th>
                  {visibleEventKeys.map((eventKey) => (
                    <th key={eventKey} className="p-2 text-center whitespace-nowrap">
                      {events[eventKey]?.shortTitle ?? events[eventKey]?.title ?? eventKey}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={3 + visibleEventKeys.length} className="p-8 text-center text-slate-400">
                      {students.length === 0 ? (
                        <div>
                          <p className="mb-2">아직 등록된 수련생이 없습니다.</p>
                          <button
                            type="button"
                            onClick={() => setActiveSubTab('STUDENTS')}
                            className="text-[#1B5E20] font-bold hover:underline cursor-pointer"
                          >
                            수련생 관리 탭에서 먼저 추가해 주세요 →
                          </button>
                        </div>
                      ) : (
                        '해당 조건의 수련생이 없습니다.'
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedRows.map(({ student }) => {
                    const isDone = visibleEventKeys.some(
                      (eventKey) => (countsMap[eventKey]?.[student.id] || '') !== ''
                    );

                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors ${isDone ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
                      >
                        <td className="p-3 text-slate-400 font-mono">{student.studentNo}</td>
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${student.avatarColor} text-white font-bold text-[10px] flex items-center justify-center`}
                          >
                            {student.name.substring(0, 1)}
                          </div>
                          <span>{student.name}</span>
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </td>
                        <td className="p-3 text-slate-500 font-medium">{student.grade}</td>
                        {visibleEventKeys.map((eventKey) => {
                          const pb = getStudentPersonalBest(records, student.id, eventKey);
                          const currentVal = countsMap[eventKey]?.[student.id] || '';
                          return (
                            <td key={eventKey} className="p-2 text-center align-top">
                              <div className="text-[10px] text-slate-400 font-semibold mb-1 whitespace-nowrap">
                                {pb ? `PB ${pb.count}` : '기록없음'}
                              </div>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                placeholder="0"
                                value={currentVal}
                                onChange={(e) => handleInputChange(eventKey, student.id, e.target.value)}
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
                                className="w-16 text-right px-2 py-1.5 bg-slate-50 border border-slate-200 focus:border-[#66BB6A] rounded-lg text-sm text-slate-900 font-bold focus:outline-none shadow-xs"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => onClose(selectedEventKey === ALL_EVENTS_KEY ? undefined : selectedEventKey)}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition-all border border-slate-200/80 whitespace-nowrap"
            >
              닫기 / 랭킹보드로
            </button>

            <button
              onClick={handleSaveBatchClick}
              className="px-4 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>일괄 기록 저장</span>
            </button>
          </div>
          </div>
        </div>
      )}

      {/* EVENT MANAGEMENT SUB TAB */}
      {activeSubTab === 'EVENTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-slate-400" />
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
                onClick={() => {
                  if (eventKeys.length >= eventLimit) {
                    setPlanLimitPopup('FREE_PLAN_EVENT_LIMIT_REACHED');
                  } else {
                    setShowAddEventModal(true);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>새 측정 종목 추가{eventLimit !== Infinity ? ` (${eventKeys.length}/${eventLimit})` : ''}</span>
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {meta.timeSeconds}초 측정
                      </span>
                      {meta.isCustom ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1B5E20] text-white">
                          직접 추가됨
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">기본 제공</span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mb-1">{meta.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mb-2">{meta.technique}</p>

                    {editingBenchmarkKey === key ? (
                      <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl">
                        <span className="text-[11px] text-slate-600 font-bold shrink-0">우수</span>
                        <input
                          type="number"
                          min={0}
                          autoFocus
                          value={benchmarkGoodDraft}
                          onChange={(e) => setBenchmarkGoodDraft(e.target.value)}
                          className="w-14 px-1.5 py-1 rounded-lg bg-white border border-[#66BB6A] text-[11px] font-bold text-slate-900 focus:outline-none"
                        />
                        <span className="text-[11px] text-slate-600 font-bold shrink-0">프로</span>
                        <input
                          type="number"
                          min={0}
                          value={benchmarkProDraft}
                          onChange={(e) => setBenchmarkProDraft(e.target.value)}
                          className="w-14 px-1.5 py-1 rounded-lg bg-white border border-[#66BB6A] text-[11px] font-bold text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveBenchmarks(key)}
                          className="ml-auto p-1 text-emerald-600 hover:bg-emerald-100 rounded-md cursor-pointer shrink-0"
                          title="저장"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBenchmarkKey(null)}
                          className="p-1 text-slate-400 hover:bg-slate-200 rounded-md cursor-pointer shrink-0"
                          title="취소"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBenchmarkKey(key);
                          setBenchmarkGoodDraft(String(meta.benchmarkGood ?? 50));
                          setBenchmarkProDraft(String(meta.benchmarkPro ?? 80));
                        }}
                        className="w-full flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl font-mono transition-colors cursor-pointer"
                      >
                        <span className="flex-1 text-left">
                          표준 기준: 우수 {meta.benchmarkGood ?? 50}회 / 프로 {meta.benchmarkPro ?? 80}회
                        </span>
                        <Pencil className="w-3 h-3 text-slate-400 shrink-0" />
                      </button>
                    )}
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
          {/* Top Banner & Excel Roster Upload -- always visible, condensed
              to a 2-up row (download / upload) instead of a long paragraph
              above a separate full-width drop zone, matching the record-
              entry tab's excel section. */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Template Download */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0">
                    <Download className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">1. 명단 양식 다운로드</h4>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mb-3 flex-1">
                  이미 등록된 수련생은 '반' 열만 채워서 다시 올리면 반 정보만 갱신돼요. 여러 반이면 콤마(,)로 구분하세요
                  (예: 월1부, 화2부).
                </p>
                <button
                  type="button"
                  onClick={() => downloadStudentRosterTemplate(gym.name, students)}
                  className="w-full py-2 px-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>양식 다운로드</span>
                </button>
              </div>

              {/* 2. Upload */}
              <div className="bg-slate-50/80 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-4 text-center transition-all flex flex-col">
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
                  className="cursor-pointer flex flex-col items-center justify-center gap-1.5 flex-1"
                >
                  <Upload className="w-5 h-5 text-slate-600" />
                  <span className="text-xs font-bold text-slate-900">2. 엑셀 업로드</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    이름·학년·성별·반 열이 포함된 파일을 선택하거나 드래그앤드롭하세요
                  </span>
                </label>

                {isParsingRosterExcel && (
                  <p className="text-[11px] text-slate-500 font-bold mt-2 animate-pulse">명단 분석 중...</p>
                )}

                {rosterExcelError && (
                  <div className="mt-2 bg-rose-50 border border-rose-200 rounded-lg p-2 text-[11px] text-rose-700 font-bold flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{rosterExcelError}</span>
                  </div>
                )}

                {rosterSuccessMsg && (
                  <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-[11px] text-emerald-900 font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{rosterSuccessMsg}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Parsed Roster Preview Table */}
            {parsedRosterRows.length > 0 && (
              <div className="mt-4 pt-4 border-t border-emerald-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      업로드된 명단 미리보기 ({parsedRosterRows.length}명 감지됨)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {parsedRosterRows.filter((r) => !students.some((s) => s.name.trim() === r.name.trim())).length}명 신규 등록 예정
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {
                        parsedRosterRows.filter((r) => {
                          const existing = students.find((s) => s.name.trim() === r.name.trim());
                          return (
                            !!existing &&
                            !!r.classLabel &&
                            normalizeClassLabels(r.classLabel) !== normalizeClassLabels(existing.classLabel)
                          );
                        }).length
                      }명 반 정보 갱신 예정
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
                      className="px-4 py-1.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>수련생 명단 최종 일괄 등록 실행 ({parsedRosterRows.length}명)</span>
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-2.5 w-12 text-center">#</th>
                        <th className="p-2.5">수련생 이름</th>
                        <th className="p-2.5">학년 / 부서</th>
                        <th className="p-2.5">성별</th>
                        <th className="p-2.5">반</th>
                        <th className="p-2.5 text-right">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {parsedRosterRows.map((row, idx) => {
                        const existing = students.find((s) => s.name.trim() === row.name.trim());
                        const willUpdateClass =
                          !!existing &&
                          !!row.classLabel &&
                          normalizeClassLabels(row.classLabel) !== normalizeClassLabels(existing.classLabel);
                        return (
                          <tr key={idx} className={existing && !willUpdateClass ? 'bg-slate-50/80' : 'hover:bg-slate-50'}>
                            <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{row.name}</td>
                            <td className="p-2.5 text-slate-600">{row.grade}</td>
                            <td className="p-2.5 text-slate-600">{row.gender === 'M' ? '남학생' : '여학생'}</td>
                            <td className="p-2.5 text-slate-600">{row.classLabel || '-'}</td>
                            <td className="p-2.5 text-right">
                              {!existing ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  신규 추가
                                </span>
                              ) : willUpdateClass ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  반 정보 갱신
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                  기존 수련생 (변경없음)
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
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>체육관 등록 수련생 목록</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    총 {students.length}명
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (students.length >= studentLimit) {
                      setPlanLimitPopup('STUDENT_LIMIT_REACHED');
                    } else {
                      setShowAddStudentModal(true);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    개별 수련생 직접 추가{studentLimit !== Infinity ? ` (${students.length}/${studentLimit})` : ''}
                  </span>
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
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#66BB6A]"
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

              {classOptions.length > 0 && (
                <select
                  value={studentRosterClass}
                  onChange={(e) => setStudentRosterClass(e.target.value)}
                  className="w-full sm:w-36 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="ALL">전체 반</option>
                  <option value={UNASSIGNED_CLASS_KEY}>미배정</option>
                  {classOptions.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[720px] overflow-y-auto pt-2">
              {students
                .filter((student) => {
                  const matchesSearch = student.name.toLowerCase().includes(studentRosterSearch.toLowerCase());
                  const matchesGrade = studentRosterGrade === 'ALL' || student.grade === studentRosterGrade;
                  const matchesClass =
                    studentRosterClass === 'ALL' ||
                    (studentRosterClass === UNASSIGNED_CLASS_KEY
                      ? parseClassLabels(student.classLabel).length === 0
                      : studentInClass(student.classLabel, studentRosterClass));
                  return matchesSearch && matchesGrade && matchesClass;
                })
                .map((student) => (
                  <div
                    key={student.id}
                    className="bg-slate-50/80 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${student.avatarColor} text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs`}
                      >
                        {student.name.substring(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs">{student.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {student.grade} • {student.studentNo}
                        </div>
                        {editingClassStudentId === student.id ? (
                          <div className="mt-1">
                            <ClassLabelsField
                              value={classDraft}
                              onChange={setClassDraft}
                              onBlurAway={(finalValue) => handleSaveClassLabel(student.id, finalValue)}
                              onCancel={() => setEditingClassStudentId(null)}
                              placeholder="예: 1부"
                              autoFocus
                              compact
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClassStudentId(student.id);
                              setClassDraft(student.classLabel ?? '');
                            }}
                            className="mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-[#66BB6A] hover:text-slate-700 cursor-pointer"
                            title="반/수업시간 지정"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            <span>{student.classLabel || '반 지정'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStudentToDelete(student)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs grid place-items-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              커스텀 줄넘기 종목 추가
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
                  if (err instanceof PlanLimitError) {
                    setShowAddEventModal(false);
                    setPlanLimitPopup(err.code);
                  } else {
                    setActionError('종목 추가 중 오류가 발생했습니다.');
                  }
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#66BB6A] font-medium"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#66BB6A] font-medium"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#66BB6A] font-medium"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#66BB6A] font-medium"
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
                  className="px-4 py-2 rounded-xl bg-[#1B5E20] text-white font-bold hover:bg-[#1B5E20]/90"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs grid place-items-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-4">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#66BB6A] font-medium"
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

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  반 / 수업시간 <span className="text-slate-400 font-medium">(선택, 여러 반이면 각각 입력 후 Enter)</span>
                </label>
                <ClassLabelsField
                  value={newStudentClassLabel}
                  onChange={setNewStudentClassLabel}
                  placeholder="예: 월1부"
                />
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
                  className="px-4 py-2 rounded-xl bg-[#1B5E20] text-white font-bold hover:bg-[#1B5E20]/90"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Batch Save -- coaches kept saving to the wrong event */}
      <ConfirmModal
        isOpen={showSaveConfirm}
        title="기록 저장"
        message={(() => {
          const pending = buildBatchEntries();
          const titles = Array.from(new Set(pending.map((e) => events[e.eventKey]?.title ?? e.eventKey)));
          return `${measurementDate} 날짜로 [${titles.join(', ')}] 종목에 총 ${pending.length}건의 기록을 저장할까요?`;
        })()}
        confirmText="저장하기"
        variant="primary"
        onConfirm={handleSaveBatch}
        onClose={() => setShowSaveConfirm(false)}
      />

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

      {/* Plan Limit Upgrade Prompt */}
      <UpgradeModal
        code={planLimitPopup}
        onUpgrade={() => {
          setPlanLimitPopup(null);
          onNavigateToPricing();
        }}
        onClose={() => setPlanLimitPopup(null)}
      />
    </div>
  );
};

