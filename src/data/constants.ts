import { EventKey, EventMeta, GradeGroup, GradeCategory, GradeCategoryFilter } from '../types';

export const DEFAULT_EVENTS: Record<string, EventMeta> = {
  '30s_alternate': {
    key: '30s_alternate',
    timeSeconds: 30,
    title: '30초 번갈아뛰기',
    shortTitle: '30초 번갈아',
    technique: '번갈아뛰기',
    iconName: 'Zap',
    badgeBg: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    badgeText: '민첩성 스피드',
    benchmarkGood: 80,
    benchmarkPro: 95,
    description: '30초 동안 오른발과 왼발을 번갈아 디디며 순발력과 템포를 다투는 대표 스피드 종목입니다.',
    isCustom: false,
  },
  '30s_double': {
    key: '30s_double',
    timeSeconds: 30,
    title: '30초 이중뛰기',
    shortTitle: '30초 이중',
    technique: '이중뛰기',
    iconName: 'Flame',
    badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    badgeText: '고난도 스피드',
    benchmarkGood: 75,
    benchmarkPro: 90,
    description: '1회 점프에 줄을 2번 회전시키는 이중뛰기(쌩쌩이)의 30초 한계 도전 종목입니다.',
    isCustom: false,
  },
  '30s_basic': {
    key: '30s_basic',
    timeSeconds: 30,
    title: '30초 양발모아뛰기',
    shortTitle: '30초 양발',
    technique: '양발모아뛰기',
    iconName: 'Footprints',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    badgeText: '기본 스피드',
    benchmarkGood: 110,
    benchmarkPro: 140,
    description: '30초 동안 양발을 붙이고 일정한 박자로 빠르게 넘는 기초 스피드 종목입니다.',
    isCustom: false,
  },
  '10s_alternate': {
    key: '10s_alternate',
    timeSeconds: 10,
    title: '10초 번갈아뛰기',
    shortTitle: '10초 번갈아',
    technique: '번갈아뛰기',
    iconName: 'Gauge',
    badgeBg: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
    badgeText: '순발력 폭발',
    benchmarkGood: 26,
    benchmarkPro: 31,
    description: '10초 동안 초고속발짓으로 정밀도와 스피드의 한계를 겨루는 최고 인기 종목입니다.',
    isCustom: false,
  },
  '10s_double': {
    key: '10s_double',
    timeSeconds: 10,
    title: '10초 이중뛰기',
    shortTitle: '10초 이중',
    technique: '이중뛰기',
    iconName: 'Trophy',
    badgeBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
    badgeText: '단거리 이중',
    benchmarkGood: 25,
    benchmarkPro: 30,
    description: '10초 동안 무결점으로 빠르게 이중뛰기를 성공시켜야 하는 순간 집중력 종목입니다.',
    isCustom: false,
  },
  '10s_basic': {
    key: '10s_basic',
    timeSeconds: 10,
    title: '10초 양발모아뛰기',
    shortTitle: '10초 양발',
    technique: '양발모아뛰기',
    iconName: 'Clock',
    badgeBg: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    badgeText: '단거리 양발',
    benchmarkGood: 36,
    benchmarkPro: 46,
    description: '10초의 극짧은 순간 동안 순발력 있게 양발을 모아 넘는 단거리 순발력 측정입니다.',
    isCustom: false,
  },
};

export const EVENTS = DEFAULT_EVENTS;
export const EVENT_KEYS = Object.keys(DEFAULT_EVENTS);

export const GRADE_GROUPS: GradeGroup[] = [
  '유치부 5세',
  '유치부 6세',
  '유치부 7세',
  '초등 1학년',
  '초등 2학년',
  '초등 3학년',
  '초등 4학년',
  '초등 5학년',
  '초등 6학년',
  '중학생',
  '고등학생',
];

export const GRADE_CATEGORY_LABELS: Record<GradeCategory, string> = {
  ALL: '전체 학년',
  KINDER: '유치부',
  LOWER_ELEM: '초등 저학년 (1~3학년)',
  UPPER_ELEM: '초등 고학년 (4~6학년)',
  SECONDARY: '중·고등부',
};

// Each broad category's specific grades, for the leaderboard's drill-down chips.
export const GRADE_SUBCATEGORIES: Record<Exclude<GradeCategory, 'ALL'>, GradeGroup[]> = {
  KINDER: ['유치부 5세', '유치부 6세', '유치부 7세'],
  LOWER_ELEM: ['초등 1학년', '초등 2학년', '초등 3학년'],
  UPPER_ELEM: ['초등 4학년', '초등 5학년', '초등 6학년'],
  SECONDARY: ['중학생', '고등학생'],
};

export function matchesGradeCategory(
  grade: GradeGroup,
  filter: GradeCategoryFilter
): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'KINDER' || filter === 'LOWER_ELEM' || filter === 'UPPER_ELEM' || filter === 'SECONDARY') {
    return (GRADE_SUBCATEGORIES[filter] as GradeGroup[]).includes(grade);
  }
  return grade === filter;
}

export function getBadgeForCount(eventMeta: EventMeta | undefined | null, count: number): string {
  if (!eventMeta) return '도전자';
  const pro = eventMeta.benchmarkPro || 80;
  const good = eventMeta.benchmarkGood || 50;
  if (count >= pro) return '🔥 명예의 전당';
  if (count >= good) return '⚡ 스피드 마스터';
  if (count >= Math.round(good * 0.75)) return '⭐ 다크호스';
  return '🌱 새싹 수련생';
}

export const AVATAR_COLORS = [
  'from-orange-500 to-amber-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-purple-500 to-pink-500',
  'from-rose-500 to-red-500',
  'from-indigo-500 to-violet-500',
  'from-yellow-500 to-amber-600',
  'from-sky-500 to-indigo-500',
];
