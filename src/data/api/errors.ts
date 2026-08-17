export type PlanLimitCode = 'FREE_PLAN_EVENT_LIMIT_REACHED' | 'STUDENT_LIMIT_REACHED' | 'BASIC_FEATURE_LOCKED';

export class PlanLimitError extends Error {
  code: PlanLimitCode;
  constructor(code: PlanLimitCode) {
    super(code);
    this.name = 'PlanLimitError';
    this.code = code;
  }
}

const PLAN_LIMIT_CODES: PlanLimitCode[] = ['FREE_PLAN_EVENT_LIMIT_REACHED', 'STUDENT_LIMIT_REACHED'];

/** Translates the DB trigger's raised exceptions into typed errors the UI can branch on. */
export function throwOnDbError(error: { message?: string } | null): void {
  if (!error) return;
  const matched = PLAN_LIMIT_CODES.find((code) => error.message?.includes(code));
  if (matched) throw new PlanLimitError(matched);
  throw error;
}

export function planLimitMessage(code: PlanLimitCode): string {
  if (code === 'FREE_PLAN_EVENT_LIMIT_REACHED') {
    return '무료 플랜은 기본 제공 종목 6개까지만 이용할 수 있습니다. 종목을 추가하려면 베이직 플랜으로 업그레이드해 주세요.';
  }
  if (code === 'BASIC_FEATURE_LOCKED') {
    return '이 기능은 베이직 플랜부터 이용할 수 있어요. 업그레이드하면 바로 사용할 수 있습니다.';
  }
  return '등록 가능한 학생 수 한도에 도달했습니다. 더 많은 학생을 등록하려면 플랜을 업그레이드해 주세요.';
}
