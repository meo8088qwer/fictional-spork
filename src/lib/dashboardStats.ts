import { Student, JumpRecord, EventMeta, GradeCategory } from '../types';
import { computeOverallScore, getStudentPersonalBest } from './scoring';
import { matchesGradeCategory, GRADE_CATEGORY_LABELS } from '../data/constants';

// Pure computation over students/records/events, same contract as scoring.ts --
// no persistence, no React. All "growth" here is derived straight from
// jump_records history (no separate "measurement round" concept in the
// schema): for each student+event pair we take that student's own last two
// records for that event, so gyms that batch-measure everyone on one date
// and gyms that enter records one-off both produce sensible results.

export interface GrowthEntry {
  student: Student;
  eventKey: string;
  eventTitle: string;
  previousCount: number;
  latestCount: number;
  diff: number;
  latestDate: string;
}

export interface EventTopEntry {
  student: Student;
  count: number;
}

export interface GrowthTrendPoint {
  roundLabel: string;
  date: string;
  avgScore: number;
}

export interface GradeGrowthBucket {
  category: GradeCategory;
  label: string;
  avgDiff: number;
  studentCount: number;
}

export type AchievementType = 'MILESTONE' | 'NEW_BEST' | 'STREAK' | 'GROWTH';

export interface Achievement {
  type: AchievementType;
  student: Student;
  eventTitle: string;
  message: string;
  date: string;
}

function sortByDate(records: JumpRecord[]): JumpRecord[] {
  return [...records].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(a.createdAt ?? a.date).getTime() - new Date(b.createdAt ?? b.date).getTime();
  });
}

/** Every (student, event) pair with 2+ records, comparing the last two by date. */
export function computeGrowthEntries(
  students: Student[],
  records: JumpRecord[],
  events: Record<string, EventMeta>
): GrowthEntry[] {
  const entries: GrowthEntry[] = [];
  const eventKeys = Object.keys(events);

  for (const student of students) {
    for (const eventKey of eventKeys) {
      const history = sortByDate(records.filter((r) => r.studentId === student.id && r.eventKey === eventKey));
      if (history.length < 2) continue;

      const latest = history[history.length - 1];
      const previous = history[history.length - 2];
      entries.push({
        student,
        eventKey,
        eventTitle: events[eventKey]?.shortTitle ?? events[eventKey]?.title ?? eventKey,
        previousCount: previous.count,
        latestCount: latest.count,
        diff: latest.count - previous.count,
        latestDate: latest.date,
      });
    }
  }

  return entries;
}

/** Growth entries where the latest record beat every earlier record for that student+event. */
export function computeNewBestEntries(
  students: Student[],
  records: JumpRecord[],
  events: Record<string, EventMeta>
): GrowthEntry[] {
  const entries: GrowthEntry[] = [];
  const eventKeys = Object.keys(events);

  for (const student of students) {
    for (const eventKey of eventKeys) {
      const history = sortByDate(records.filter((r) => r.studentId === student.id && r.eventKey === eventKey));
      if (history.length < 2) continue;

      const latest = history[history.length - 1];
      const priorBest = Math.max(...history.slice(0, -1).map((r) => r.count));
      if (latest.count <= priorBest) continue;

      entries.push({
        student,
        eventKey,
        eventTitle: events[eventKey]?.shortTitle ?? events[eventKey]?.title ?? eventKey,
        previousCount: priorBest,
        latestCount: latest.count,
        diff: latest.count - priorBest,
        latestDate: latest.date,
      });
    }
  }

  return entries;
}

/** Cumulative "체육관 성장 추이": at each measurement date, avg overall score using each student's best-so-far. */
export function computeGymGrowthTrend(
  records: JumpRecord[],
  events: Record<string, EventMeta>,
  maxPoints: number = 8
): GrowthTrendPoint[] {
  if (records.length === 0) return [];

  const recordsByDate = new Map<string, JumpRecord[]>();
  for (const r of records) {
    if (!recordsByDate.has(r.date)) recordsByDate.set(r.date, []);
    recordsByDate.get(r.date)!.push(r);
  }
  const dates = Array.from(recordsByDate.keys()).sort();

  const bestByStudent = new Map<string, Record<string, number>>();
  // A student's very first measurement DAY has no "before" to compare
  // against (same exclusion rule as growth entries) -- a batch entry often
  // records several events at once for a new student, so "2+ records" isn't
  // enough to detect that; it takes 2+ distinct measurement DATES before a
  // student has a real trend to contribute, otherwise every fresh intake
  // drags the whole average down even though nobody actually got worse.
  const datesSeenByStudent = new Map<string, Set<string>>();
  const points: GrowthTrendPoint[] = [];

  dates.forEach((date) => {
    for (const r of recordsByDate.get(date) ?? []) {
      const seenDates = datesSeenByStudent.get(r.studentId) ?? new Set<string>();
      seenDates.add(r.date);
      datesSeenByStudent.set(r.studentId, seenDates);

      const best = bestByStudent.get(r.studentId) ?? {};
      if (!best[r.eventKey] || r.count > best[r.eventKey]) {
        best[r.eventKey] = r.count;
      }
      bestByStudent.set(r.studentId, best);
    }

    let total = 0;
    let count = 0;
    for (const [studentId, best] of bestByStudent) {
      if ((datesSeenByStudent.get(studentId)?.size ?? 0) < 2) continue;
      total += computeOverallScore(best, events);
      count += 1;
    }

    // Skip rounds with zero eligible (returning) students entirely, instead
    // of emitting a fake 0-point -- otherwise a gym whose whole roster is
    // still on their first measurement gets a flat, misleading 0 line
    // instead of the honest "not enough data yet" empty state.
    if (count > 0) {
      points.push({
        roundLabel: `${points.length + 1}회차`,
        date,
        avgScore: Math.round((total / count) * 10) / 10,
      });
    }
  });

  return points.slice(-maxPoints);
}

/** Current best count per event, top 3 students. */
export function computeEventTopThree(
  students: Student[],
  records: JumpRecord[],
  events: Record<string, EventMeta>
): Record<string, EventTopEntry[]> {
  const result: Record<string, EventTopEntry[]> = {};

  for (const eventKey of Object.keys(events)) {
    const ranked = students
      .map((student) => {
        const pb = getStudentPersonalBest(records, student.id, eventKey);
        return pb ? { student, count: pb.count } : null;
      })
      .filter((entry): entry is EventTopEntry => entry !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    if (ranked.length > 0) result[eventKey] = ranked;
  }

  return result;
}

/** Avg growth per grade bucket, for the 4 broad categories already used by the leaderboard filters. */
export function computeGradeGrowth(growthEntries: GrowthEntry[]): GradeGrowthBucket[] {
  const categories: GradeCategory[] = ['KINDER', 'LOWER_ELEM', 'UPPER_ELEM', 'SECONDARY'];

  return categories
    .map((category) => {
      // A student can appear in multiple growth entries (several events) --
      // average per student first so one very-active student can't skew the bucket.
      const byStudent = new Map<string, number[]>();
      for (const entry of growthEntries) {
        if (!matchesGradeCategory(entry.student.grade, category)) continue;
        const diffs = byStudent.get(entry.student.id) ?? [];
        diffs.push(entry.diff);
        byStudent.set(entry.student.id, diffs);
      }

      const studentAverages = Array.from(byStudent.values()).map(
        (diffs) => diffs.reduce((sum, d) => sum + d, 0) / diffs.length
      );
      const avgDiff =
        studentAverages.length > 0
          ? Math.round((studentAverages.reduce((sum, d) => sum + d, 0) / studentAverages.length) * 10) / 10
          : 0;

      return { category, label: GRADE_CATEGORY_LABELS[category], avgDiff, studentCount: studentAverages.length };
    })
    .filter((bucket) => bucket.studentCount > 0);
}

const MILESTONE_STEP = 50;

/** "오늘의 기록 달성" cards -- one per student+event, picking the single most notable thing that happened. */
export function computeAchievements(
  students: Student[],
  records: JumpRecord[],
  events: Record<string, EventMeta>,
  limit: number = 6
): Achievement[] {
  const achievements: Achievement[] = [];
  const eventKeys = Object.keys(events);

  for (const student of students) {
    for (const eventKey of eventKeys) {
      const history = sortByDate(records.filter((r) => r.studentId === student.id && r.eventKey === eventKey));
      if (history.length < 2) continue;

      const latest = history[history.length - 1];
      const previous = history[history.length - 2];
      const eventTitle = events[eventKey]?.shortTitle ?? events[eventKey]?.title ?? eventKey;
      const priorBest = Math.max(...history.slice(0, -1).map((r) => r.count));

      const crossedMilestone =
        Math.floor(latest.count / MILESTONE_STEP) > Math.floor(previous.count / MILESTONE_STEP);
      const milestoneValue = Math.floor(latest.count / MILESTONE_STEP) * MILESTONE_STEP;

      let streak = 1;
      for (let i = history.length - 1; i > 0; i--) {
        if (history[i].count > history[i - 1].count) streak += 1;
        else break;
      }

      if (crossedMilestone && latest.count >= MILESTONE_STEP) {
        achievements.push({
          type: 'MILESTONE',
          student,
          eventTitle,
          message: `${eventTitle} 처음으로 ${milestoneValue}개 돌파!`,
          date: latest.date,
        });
      } else if (latest.count > priorBest) {
        achievements.push({
          type: 'NEW_BEST',
          student,
          eventTitle,
          message: `${eventTitle} 개인 최고기록 갱신!`,
          date: latest.date,
        });
      } else if (streak >= 3) {
        achievements.push({
          type: 'STREAK',
          student,
          eventTitle,
          message: `${eventTitle} ${streak}회 연속 기록 상승!`,
          date: latest.date,
        });
      } else if (latest.count - previous.count >= 10) {
        achievements.push({
          type: 'GROWTH',
          student,
          eventTitle,
          message: `${eventTitle} 지난 기록보다 +${latest.count - previous.count}개 성장!`,
          date: latest.date,
        });
      }
    }
  }

  return achievements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
}
