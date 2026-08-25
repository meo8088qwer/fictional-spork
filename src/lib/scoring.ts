import {
  Student,
  JumpRecord,
  EventKey,
  EventMeta,
  DisplayTab,
  GradeCategoryFilter,
  StudentLeaderboardItem,
} from '../types';
import { matchesGradeCategory } from '../data/constants';

// Pure computation over students/records/events -- no persistence here.
// Callers (Supabase-backed hooks, the public-board RPC mapper) are
// responsible for fetching the events map and passing it in explicitly.

export function getStudentPersonalBest(
  records: JumpRecord[],
  studentId: string,
  eventKey: EventKey
): { count: number; date: string } | null {
  const filtered = records.filter(
    (r) => r.studentId === studentId && r.eventKey === eventKey
  );
  if (filtered.length === 0) return null;

  filtered.sort((a, b) => b.count - a.count || new Date(b.date).getTime() - new Date(a.date).getTime());
  return { count: filtered[0].count, date: filtered[0].date };
}

export function computeOverallScore(
  allBestRecords: Partial<Record<EventKey, number>>,
  eventsMap: Record<string, EventMeta>
): number {
  let totalScore = 0;

  for (const key of Object.keys(eventsMap)) {
    const count = allBestRecords[key] || 0;
    const meta = eventsMap[key];
    let multiplier = 1.0;
    if (meta) {
      if (meta.timeSeconds <= 10) multiplier = 1.5;
      else if (meta.timeSeconds <= 30) multiplier = 2;
      else multiplier = 1.0;
    }
    totalScore += Math.round(count * multiplier);
  }
  return totalScore;
}

export function getLeaderboardData(
  students: Student[],
  records: JumpRecord[],
  activeTab: DisplayTab,
  gradeFilter: GradeCategoryFilter,
  searchQuery: string,
  eventsMap: Record<string, EventMeta>
): StudentLeaderboardItem[] {
  const searchLower = searchQuery.trim().toLowerCase();
  const eligibleStudents = students.filter((student) => {
    const matchesGrade = matchesGradeCategory(student.grade, gradeFilter);
    const matchesSearch =
      !searchLower ||
      student.name.toLowerCase().includes(searchLower) ||
      student.studentNo.toLowerCase().includes(searchLower);
    return matchesGrade && matchesSearch;
  });

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

  items.sort((a, b) => {
    if (b.personalBestCount !== a.personalBestCount) {
      return b.personalBestCount - a.personalBestCount;
    }
    return b.overallScore - a.overallScore;
  });

  items.forEach((item, index) => {
    item.rank = index + 1;

    if (item.rank <= 3) {
      item.trend = 'UP';
      item.trendDiff = Math.floor(Math.random() * 2) + 1;
    } else {
      item.trend = 'SAME';
    }
  });

  return items;
}
