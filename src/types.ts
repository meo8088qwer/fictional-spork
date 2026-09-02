export type EventKey = string;

export type DisplayTab = EventKey | 'OVERALL';

export type TimeFilter = 'ALL' | '30S' | '10S' | 'CUSTOM';

export type GradeGroup =
  | '유치부 5세'
  | '유치부 6세'
  | '유치부 7세'
  | '초등 1학년'
  | '초등 2학년'
  | '초등 3학년'
  | '초등 4학년'
  | '초등 5학년'
  | '초등 6학년'
  | '중학생'
  | '고등학생';

export type GradeCategory = 'ALL' | 'KINDER' | 'LOWER_ELEM' | 'UPPER_ELEM' | 'SECONDARY';

// A leaderboard filter is either one of the 4 broad categories, or a
// specific grade drilled into from that category's sub-chips.
export type GradeCategoryFilter = GradeCategory | GradeGroup;

export interface EventMeta {
  key: string;
  timeSeconds: number;
  title: string;
  shortTitle: string;
  technique: string;
  iconName?: string;
  badgeBg?: string;
  badgeText?: string;
  benchmarkGood?: number;
  benchmarkPro?: number;
  description: string;
  isCustom?: boolean;
}

export interface Student {
  id: string;
  studentNo: string;
  name: string;
  grade: GradeGroup;
  gender: 'M' | 'F';
  avatarColor: string;
  joinDate: string;
  notes?: string;
  // Optional 반/수업시간 grouping (e.g. "1부", "2부") the gym assigns per
  // student -- reuses the pre-existing branch_name DB column. A student in
  // several classes (e.g. rotating through the week) stores them as one
  // comma-separated string; use src/lib/classLabels.ts to read/write it.
  classLabel?: string;
}

export interface JumpRecord {
  id: string;
  studentId: string;
  studentName: string;
  eventKey: EventKey;
  count: number;
  date: string; // YYYY-MM-DD
  createdAt?: string;
  isPersonalBest?: boolean;
  isGymRecord?: boolean;
  videoUrl?: string;
  verifiedByCoach?: string;
}

export interface StudentLeaderboardItem {
  rank: number;
  student: Student;
  personalBestCount: number;
  recordDate: string;
  previousRank?: number;
  trend: 'UP' | 'DOWN' | 'SAME' | 'NEW';
  trendDiff?: number;
  badgeTitle?: string;
  allRecords: Partial<Record<EventKey, number>>;
  overallScore: number;
}
