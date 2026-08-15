import {
  Student,
  JumpRecord,
  EventKey,
  EventMeta,
  DisplayTab,
  GradeCategoryFilter,
  StudentLeaderboardItem,
} from '../types';
import { INITIAL_STUDENTS, INITIAL_RECORDS } from '../data/mockData';
import { DEFAULT_EVENTS, matchesGradeCategory } from '../data/constants';

const STORAGE_KEYS = {
  STUDENTS: 'jumpfire_students_v1',
  RECORDS: 'jumpfire_records_v1',
  EVENTS: 'jumpfire_events_v2',
};

// Events Management
export function getLocalEvents(): Record<string, EventMeta> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed reading events from storage', e);
  }
  return DEFAULT_EVENTS;
}

export function saveLocalEvents(events: Record<string, EventMeta>) {
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
}

export function addCustomEvent(newEventMeta: EventMeta): Record<string, EventMeta> {
  const currentEvents = getLocalEvents();
  const updated = {
    ...currentEvents,
    [newEventMeta.key]: {
      ...newEventMeta,
      isCustom: true,
    },
  };
  saveLocalEvents(updated);
  return updated;
}

export function deleteCustomEvent(eventKey: string): Record<string, EventMeta> {
  const currentEvents = getLocalEvents();
  const updated = { ...currentEvents };
  delete updated[eventKey];
  saveLocalEvents(updated);
  return updated;
}

export function resetDefaultEvents(): Record<string, EventMeta> {
  saveLocalEvents(DEFAULT_EVENTS);
  return DEFAULT_EVENTS;
}

export function getLocalStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading students from storage', e);
  }
  return INITIAL_STUDENTS;
}

export function saveLocalStudents(students: Student[]) {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
}

export function getLocalRecords(): JumpRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading records from storage', e);
  }
  return INITIAL_RECORDS;
}

export function saveLocalRecords(records: JumpRecord[]) {
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
}

export function resetToDefaultData(): { students: Student[]; records: JumpRecord[]; events: Record<string, EventMeta> } {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(INITIAL_RECORDS));
  saveLocalEvents(DEFAULT_EVENTS);
  return { students: INITIAL_STUDENTS, records: INITIAL_RECORDS, events: DEFAULT_EVENTS };
}

// Compute personal best for a student in a specific event
export function getStudentPersonalBest(
  records: JumpRecord[],
  studentId: string,
  eventKey: EventKey
): { count: number; date: string } | null {
  const filtered = records.filter(
    (r) => r.studentId === studentId && r.eventKey === eventKey
  );
  if (filtered.length === 0) return null;

  // sort descending by count, then date
  filtered.sort((a, b) => b.count - a.count || new Date(b.date).getTime() - new Date(a.date).getTime());
  return { count: filtered[0].count, date: filtered[0].date };
}

// Compute composite overall speed score for a student across all active events
export function computeOverallScore(
  allBestRecords: Partial<Record<EventKey, number>>,
  eventsMap: Record<string, EventMeta> = getLocalEvents()
): number {
  let totalScore = 0;

  for (const key of Object.keys(eventsMap)) {
    const count = allBestRecords[key] || 0;
    const meta = eventsMap[key];
    // Dynamic difficulty multiplier based on event duration
    let multiplier = 1.0;
    if (meta) {
      if (meta.timeSeconds <= 10) multiplier = 2.5;
      else if (meta.timeSeconds <= 30) multiplier = 1.2;
      else multiplier = 1.0;
      if (meta.technique.includes('이중') || meta.technique.includes('삼중')) {
        multiplier *= 1.5;
      }
    }
    totalScore += Math.round(count * multiplier);
  }
  return totalScore;
}

// Generate filtered leaderboard items
export function getLeaderboardData(
  students: Student[],
  records: JumpRecord[],
  activeTab: DisplayTab,
  gradeFilter: GradeCategoryFilter = 'ALL',
  searchQuery = '',
  eventsMap: Record<string, EventMeta> = getLocalEvents()
): StudentLeaderboardItem[] {
  // 1. Filter students by grade category and search query
  const searchLower = searchQuery.trim().toLowerCase();
  const eligibleStudents = students.filter((student) => {
    const matchesGrade = matchesGradeCategory(student.grade, gradeFilter);
    const matchesSearch =
      !searchLower ||
      student.name.toLowerCase().includes(searchLower) ||
      student.studentNo.toLowerCase().includes(searchLower);
    return matchesGrade && matchesSearch;
  });

  // 2. Map student stats
  const items: StudentLeaderboardItem[] = eligibleStudents.map((student) => {
    const allBest: Partial<Record<EventKey, number>> = {};
    let activeBestCount = 0;
    let activeRecordDate = '-';

    for (const eventKey of Object.keys(eventsMap)) {
      const pb = getStudentPersonalBest(records, student.id, eventKey);
      if (pb) {
        allBest[eventKey] = pb.count;
        if (eventKey === activeTab) {
          activeBestCount = pb.count;
          activeRecordDate = pb.date;
        }
      }
    }

    const overallScore = computeOverallScore(allBest, eventsMap);

    return {
      rank: 0, // set in sorting
      student,
      personalBestCount: activeTab === 'OVERALL' ? overallScore : activeBestCount,
      recordDate: activeRecordDate,
      allRecords: allBest,
      overallScore,
      trend: 'SAME',
    };
  });

  // 3. Sort by score/count descending
  items.sort((a, b) => {
    if (b.personalBestCount !== a.personalBestCount) {
      return b.personalBestCount - a.personalBestCount;
    }
    // Secondary tie-breaker: overall score
    return b.overallScore - a.overallScore;
  });

  // 4. Assign ranks & badges
  items.forEach((item, index) => {
    item.rank = index + 1;

    // Simulate trend based on rank
    if (item.rank <= 3) {
      item.trend = 'UP';
      item.trendDiff = Math.floor(Math.random() * 2) + 1;
    } else {
      item.trend = 'SAME';
    }
  });

  return items;
}

// Batch Add/Update records for multiple students at once
export function batchSaveRecords(
  records: JumpRecord[],
  newEntries: Array<{ studentId: string; studentName: string; eventKey: EventKey; count: number; date: string }>
): JumpRecord[] {
  const updatedRecords = [...records];

  for (const entry of newEntries) {
    if (entry.count <= 0) continue;

    const newRecord: JumpRecord = {
      id: `r-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: entry.studentId,
      studentName: entry.studentName,
      eventKey: entry.eventKey,
      count: Number(entry.count),
      date: entry.date,
      verifiedByCoach: '체육관 관리자',
    };

    // Check if this record is a personal best
    const previousPb = getStudentPersonalBest(records, entry.studentId, entry.eventKey);
    if (!previousPb || entry.count > previousPb.count) {
      newRecord.isPersonalBest = true;
    }

    updatedRecords.push(newRecord);
  }

  saveLocalRecords(updatedRecords);
  return updatedRecords;
}
