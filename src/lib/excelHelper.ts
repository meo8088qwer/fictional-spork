import * as XLSX from 'xlsx';
import { EventKey, EventMeta, GradeGroup, Student, JumpRecord } from '../types';
import { DEFAULT_EVENTS, GRADE_GROUPS } from '../data/constants';
import { getStudentPersonalBest } from './scoring';
import { todayLocalDate } from './dateHelper';

const GENDER_LABEL: Record<'M' | 'F', string> = { M: '남', F: '여' };

// Helper to normalize event title to EventKey dynamically
export function resolveEventKey(
  inputStr: string,
  eventsMap: Record<string, EventMeta>
): EventKey | null {
  if (!inputStr) return null;
  const cleaned = String(inputStr).trim().toLowerCase().replace(/\s+/g, '');

  // 1. Direct match with event titles, short titles, or keys
  for (const [key, meta] of Object.entries(eventsMap)) {
    if (key.toLowerCase() === cleaned) return key;
    if (meta.title.toLowerCase().replace(/\s+/g, '') === cleaned) return key;
    if (meta.shortTitle.toLowerCase().replace(/\s+/g, '') === cleaned) return key;
  }

  // 2. Partial keyword matching
  if (cleaned.includes('30초') && (cleaned.includes('번갈아') || cleaned.includes('alternate'))) {
    return '30s_alternate';
  }
  if (cleaned.includes('30초') && (cleaned.includes('이중') || cleaned.includes('double'))) {
    return '30s_double';
  }
  if (cleaned.includes('30초') && (cleaned.includes('양발') || cleaned.includes('basic') || cleaned.includes('모아'))) {
    return '30s_basic';
  }
  if (cleaned.includes('10초') && (cleaned.includes('번갈아') || cleaned.includes('alternate'))) {
    return '10s_alternate';
  }
  if (cleaned.includes('10초') && (cleaned.includes('이중') || cleaned.includes('double'))) {
    return '10s_double';
  }
  if (cleaned.includes('10초') && (cleaned.includes('양발') || cleaned.includes('basic') || cleaned.includes('모아'))) {
    return '10s_basic';
  }

  // 3. Fallback title includes match for custom events
  for (const [key, meta] of Object.entries(eventsMap)) {
    const titleClean = meta.title.toLowerCase().replace(/\s+/g, '');
    if (cleaned.includes(titleClean) || titleClean.includes(cleaned)) {
      return key;
    }
  }

  return null;
}

// Helper to resolve grade strings like '유-6', '유-7', '초-1', '초-6' into GradeGroup
export function resolveGradeGroup(inputStr: string): GradeGroup {
  if (!inputStr) return '초등 3학년';
  const cleaned = String(inputStr).trim().replace(/\s+/g, '');

  if (GRADE_GROUPS.includes(cleaned as GradeGroup)) {
    return cleaned as GradeGroup;
  }

  // Kindergarten / Preschool ('유-5', '5세', '유-6', '6세', '유-7', '7세', '유치', '유치부')
  if (cleaned.includes('5') && (cleaned.startsWith('유') || cleaned.includes('세'))) return '유치부 5세';
  if (cleaned.includes('7') && (cleaned.startsWith('유') || cleaned.includes('세'))) return '유치부 7세';
  if (cleaned.startsWith('유') || cleaned.includes('유치') || /^[678]세$/.test(cleaned)) {
    return '유치부 6세';
  }

  // Elementary Grades ('초-1', '초1', '초등1', '1학년')
  if (cleaned.includes('초-1') || cleaned.includes('초1') || cleaned === '1학년' || cleaned.includes('초등1')) return '초등 1학년';
  if (cleaned.includes('초-2') || cleaned.includes('초2') || cleaned === '2학년' || cleaned.includes('초등2')) return '초등 2학년';
  if (cleaned.includes('초-3') || cleaned.includes('초3') || cleaned === '3학년' || cleaned.includes('초등3')) return '초등 3학년';
  if (cleaned.includes('초-4') || cleaned.includes('초4') || cleaned === '4학년' || cleaned.includes('초등4')) return '초등 4학년';
  if (cleaned.includes('초-5') || cleaned.includes('초5') || cleaned === '5학년' || cleaned.includes('초등5')) return '초등 5학년';
  if (cleaned.includes('초-6') || cleaned.includes('초6') || cleaned === '6학년' || cleaned.includes('초등6')) return '초등 6학년';

  // Middle/High school ('중-1', '중학생' -> 중학생; '고-2', '고등학생' -> 고등학생)
  // '중고등부' alone is ambiguous -> defaults to 중학생.
  if (cleaned.includes('중고')) return '중학생';
  if (cleaned.includes('고')) return '고등학생';
  if (cleaned.includes('중')) return '중학생';

  // Fallback regex for digit
  const matchDigit = cleaned.match(/([1-6])/);
  if (matchDigit) {
    return `초등 ${matchDigit[1]}학년` as GradeGroup;
  }

  return '초등 3학년';
}

export interface ExcelParsedRecord {
  studentName: string;
  grade?: GradeGroup;
  studentNo?: string;
  date: string;
  eventKey: EventKey;
  count: number;
}

export interface ExcelImportResult {
  totalProcessed: number;
  newPbCount: number;
  maintainedPbCount: number;
  newStudentsCreated: string[];
  details: Array<{
    studentName: string;
    eventTitle: string;
    enteredCount: number;
    previousPbCount: number;
    isNewPB: boolean;
    date: string;
  }>;
}

// Generate and Download Excel Template File. When the gym already has
// students, each row is that student's current personal best per event
// (not their full measurement history -- keeps the file small regardless
// of how many past records exist) instead of the generic example rows.
export function downloadExcelTemplate(
  eventsMap: Record<string, EventMeta>,
  students: Student[] = [],
  records: JumpRecord[] = []
) {
  const wb = XLSX.utils.book_new();
  const todayStr = todayLocalDate();

  const activeEventMetas = Object.values(eventsMap);
  const eventTitles = activeEventMetas.map((m) => m.title);
  const eventKeys = activeEventMetas.map((m) => m.key);

  // Sheet 1: Multi-Event Sheet (Recommended)
  const headerRow = ['수련생이름', '학년', '측정일자', ...eventTitles];

  const multiEventData =
    students.length > 0
      ? [
          headerRow,
          ...students.map((student) => {
            const pbs = eventKeys.map((key) => getStudentPersonalBest(records, student.id, key));
            const lastDate = pbs.reduce<string | null>(
              (latest, pb) => (pb && (!latest || pb.date > latest) ? pb.date : latest),
              null
            );
            return [
              student.name,
              student.grade,
              lastDate || todayStr,
              ...pbs.map((pb) => pb?.count ?? ''),
            ];
          }),
        ]
      : [
          headerRow,
          ['강도현', '초-3', todayStr, ...activeEventMetas.map((m) => m.benchmarkGood || 100)],
          ['김지후', '초-2', todayStr, ...activeEventMetas.map((m) => Math.round((m.benchmarkGood || 100) * 0.9))],
          ['박준우', '초-4', todayStr, ...activeEventMetas.map((m) => Math.round((m.benchmarkGood || 100) * 1.1))],
          ['이서아', '유-6', todayStr, ...activeEventMetas.map((m) => Math.round((m.benchmarkGood || 100) * 0.8))],
        ];

  const wsMulti = XLSX.utils.aoa_to_sheet(multiEventData);
  // Column Widths
  wsMulti['!cols'] = [
    { wch: 14 }, // 수련생이름
    { wch: 14 }, // 학년
    { wch: 14 }, // 측정일자
    ...eventTitles.map(() => ({ wch: 20 })),
  ];

  XLSX.utils.book_append_sheet(wb, wsMulti, '종합_종목별_입력양식');

  // Sheet 2: Single Event Sheet
  const firstEventTitle = eventTitles[0] || '30초 번갈아뛰기';
  const singleEventData = [
    ['수련생이름', '학년', '측정일자', '종목명', '측정기록(회)'],
    ['강도현', '초-3', todayStr, firstEventTitle, 142],
    ['김지후', '초-2', todayStr, firstEventTitle, 128],
    ['박준우', '초-4', todayStr, firstEventTitle, 82],
    ['이서아', '유-6', todayStr, firstEventTitle, 51],
  ];

  const wsSingle = XLSX.utils.aoa_to_sheet(singleEventData);
  wsSingle['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, wsSingle, '단일_종목별_입력양식');

  // Trigger File Download
  XLSX.writeFile(wb, `줄넘기체육관_기록입력양식_${todayStr}.xlsx`);
}

// Generate and Download Student Roster Template. Downloads the gym's
// actual roster when it has students, falling back to example rows for
// a brand new gym with nothing to export yet.
export function downloadStudentRosterTemplate(gymName: string, students: Student[] = []) {
  const wb = XLSX.utils.book_new();
  const todayStr = todayLocalDate();

  const studentRosterData =
    students.length > 0
      ? [
          ['수련생이름', '학년', '성별', '반(선택, 예: 1부)'],
          ...students.map((s) => [s.name, s.grade, GENDER_LABEL[s.gender], s.classLabel ?? '']),
        ]
      : [
          ['수련생이름', '학년', '성별', '반(선택, 예: 1부)'],
          ['강도현', '초등 3학년', '남', '1부'],
          ['김지후', '초등 2학년', '여', '1부'],
          ['박준우', '초등 4학년', '남', '2부'],
          ['이서아', '유치부 6세', '여', '2부'],
          ['최민준', '초등 6학년', '남', ''],
          ['한소율', '초등 1학년', '여', ''],
          ['김도윤', '초등 5학년', '남', ''],
          ['박하은', '중학생', '여', ''],
        ];

  const ws = XLSX.utils.aoa_to_sheet(studentRosterData);
  ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];

  XLSX.utils.book_append_sheet(wb, ws, '수련생_명단');
  XLSX.writeFile(wb, `${gymName}_수련생명단_양식_${todayStr}.xlsx`);
}

export interface ParsedStudentRow {
  name: string;
  grade: GradeGroup;
  gender: 'M' | 'F';
  classLabel?: string;
}

// Parse Student Roster Excel File
export async function parseStudentRosterExcelFile(file: File): Promise<ParsedStudentRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
        });

        const parsedStudents: ParsedStudentRow[] = [];

        jsonRows.forEach((row) => {
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            normalizedRow[String(k).trim().replace(/\s+/g, '')] = row[k];
          });

          const studentName =
            normalizedRow['수련생이름'] ||
            normalizedRow['학생이름'] ||
            normalizedRow['이름'] ||
            normalizedRow['수련생'] ||
            normalizedRow['성명'] ||
            '';

          if (!studentName || String(studentName).trim() === '') return;

          const gradeRaw =
            normalizedRow['학년'] ||
            normalizedRow['부서'] ||
            normalizedRow['학년/부서'] ||
            normalizedRow['구분'] ||
            '';
          const resolvedGrade = resolveGradeGroup(String(gradeRaw));

          const genderRaw = String(
            normalizedRow['성별'] || normalizedRow['성'] || 'M'
          ).trim().toUpperCase();
          let gender: 'M' | 'F' = 'M';
          if (genderRaw.includes('여') || genderRaw === 'F' || genderRaw === 'FEMALE') {
            gender = 'F';
          }

          // Matches our own template header ("반(선택, 예: 1부)") as well as
          // a plain "반" / "수업시간" / "분반" column someone typed by hand.
          const classKey = Object.keys(normalizedRow).find(
            (k) => k.startsWith('반') || k === '수업시간' || k === '분반' || k === '클래스'
          );
          const classLabel = classKey ? String(normalizedRow[classKey] ?? '').trim() : '';

          parsedStudents.push({
            name: String(studentName).trim(),
            grade: resolvedGrade,
            gender,
            classLabel: classLabel || undefined,
          });
        });

        resolve(parsedStudents);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Parse uploaded Excel File
export async function parseExcelFile(
  file: File,
  eventsMap: Record<string, EventMeta>
): Promise<ExcelParsedRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
        });

        const parsedRecords: ExcelParsedRecord[] = [];
        const todayStr = todayLocalDate();

        jsonRows.forEach((row) => {
          // Normalize Keys in row
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            normalizedRow[String(k).trim().replace(/\s+/g, '')] = row[k];
          });

          const studentName =
            normalizedRow['수련생이름'] ||
            normalizedRow['학생이름'] ||
            normalizedRow['이름'] ||
            normalizedRow['수련생'] ||
            '';

          if (!studentName || String(studentName).trim() === '') return;

          const gradeRaw =
            normalizedRow['학년'] ||
            normalizedRow['부서'] ||
            normalizedRow['학년/부서'] ||
            '';
          const resolvedGrade = resolveGradeGroup(String(gradeRaw));

          // Format Date
          let recordDate = todayStr;
          const rawDate = normalizedRow['측정일자'] || normalizedRow['측정일'] || normalizedRow['날짜'];
          if (rawDate) {
            if (typeof rawDate === 'number') {
              // Excel serial date number
              const jsDate = XLSX.SSF.parse_date_code(rawDate);
              if (jsDate) {
                recordDate = `${jsDate.y}-${String(jsDate.m).padStart(2, '0')}-${String(jsDate.d).padStart(2, '0')}`;
              }
            } else {
              const strDate = String(rawDate).trim();
              if (/^\d{4}-\d{2}-\d{2}$/.test(strDate)) {
                recordDate = strDate;
              } else if (/^\d{4}\.\d{2}\.\d{2}$/.test(strDate)) {
                recordDate = strDate.replace(/\./g, '-');
              } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(strDate)) {
                recordDate = strDate.replace(/\//g, '-');
              }
            }
          }

          // Case A: Single Event Format ('종목명' and '측정기록' columns exist)
          const singleEventCol =
            normalizedRow['종목명'] || normalizedRow['종목'] || normalizedRow['측정종목'];
          const singleCountCol =
            normalizedRow['측정기록(회)'] ||
            normalizedRow['측정기록'] ||
            normalizedRow['기록'] ||
            normalizedRow['기록(회)'];

          if (singleEventCol && singleCountCol !== '') {
            const eventKey = resolveEventKey(String(singleEventCol), eventsMap);
            const countNum = Number(singleCountCol);
            if (eventKey && !isNaN(countNum) && countNum > 0) {
              parsedRecords.push({
                studentName: String(studentName).trim(),
                grade: resolvedGrade,
                date: recordDate,
                eventKey,
                count: countNum,
              });
            }
          }

          // Case B: Multi-Event Format (Columns named after event titles or keys)
          Object.keys(normalizedRow).forEach((colName) => {
            const resolvedKey = resolveEventKey(colName, eventsMap);
            if (resolvedKey) {
              const val = normalizedRow[colName];
              const countNum = Number(val);
              if (val !== '' && !isNaN(countNum) && countNum > 0) {
                parsedRecords.push({
                  studentName: String(studentName).trim(),
                  grade: resolvedGrade,
                  date: recordDate,
                  eventKey: resolvedKey,
                  count: countNum,
                });
              }
            }
          });
        });

        resolve(parsedRecords);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
