// A student's 반/수업시간 is stored as one comma-separated string (reusing
// the existing branch_name text column -- no new table needed) so a
// student who rotates classes through the week (e.g. 월 1부, 화 2부, 수
// 3부) can belong to several at once instead of exactly one.

export function parseClassLabels(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function studentInClass(raw: string | undefined, classKey: string): boolean {
  return parseClassLabels(raw).includes(classKey);
}

// Re-joins into the canonical storage format, so "1부,  2부 ,1부" saves
// as the de-duplicated "1부, 2부" regardless of how it was typed.
export function normalizeClassLabels(raw?: string | null): string {
  return Array.from(new Set(parseClassLabels(raw))).join(', ');
}
