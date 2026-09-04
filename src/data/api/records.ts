import { supabase } from '../../lib/supabaseClient';
import { EventKey, JumpRecord } from '../../types';
import { getStudentPersonalBest } from '../../lib/scoring';

function mapRecordRow(row: any): JumpRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.students?.name ?? '',
    eventKey: row.event_key,
    count: row.count,
    date: row.record_date,
    createdAt: row.created_at,
    isPersonalBest: row.is_personal_best,
    isGymRecord: row.is_gym_record,
    videoUrl: row.video_url ?? undefined,
    verifiedByCoach: row.verified_by_coach ?? undefined,
  };
}

// PostgREST caps a single response at 1000 rows by default -- a gym with
// more history than that (many students x many events x many months) would
// silently lose everything past the cap, ordered oldest-first, so newly
// saved records would never appear no matter how fresh the fetch. Page
// through with .range() until a partial page confirms there's no more.
const PAGE_SIZE = 1000;

export async function listRecords(gymId: string): Promise<JumpRecord[]> {
  const allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('jump_records')
      .select('*, students(name)')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    allRows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows.map(mapRecordRow);
}

export interface BatchRecordEntry {
  studentId: string;
  studentName: string;
  eventKey: EventKey;
  count: number;
  date: string;
}

/**
 * Inserts a batch of measurement entries. `currentRecords` is the
 * already-loaded records list, used only to decide is_personal_best per
 * entry (matches the personal-best-preserving behavior the admin UI
 * promises: a lower measurement never overwrites the existing best, it's
 * just recorded in history) -- every entry is checked against that same
 * pre-batch snapshot, not against records inserted earlier in this batch.
 */
export async function batchSaveRecords(
  gymId: string,
  currentRecords: JumpRecord[],
  entries: BatchRecordEntry[]
): Promise<JumpRecord[]> {
  const validEntries = entries.filter((e) => e.count > 0);
  if (validEntries.length === 0) return [];

  const rows = validEntries.map((entry) => {
    const previousPb = getStudentPersonalBest(currentRecords, entry.studentId, entry.eventKey);
    const isPersonalBest = !previousPb || entry.count > previousPb.count;
    return {
      gym_id: gymId, // overwritten server-side from student_id by trigger; sent for type-completeness only
      student_id: entry.studentId,
      event_key: entry.eventKey,
      count: entry.count,
      record_date: entry.date,
      is_personal_best: isPersonalBest,
      verified_by_coach: '체육관 관리자',
    };
  });

  const { data, error } = await supabase.from('jump_records').insert(rows).select('*, students(name)');
  if (error) throw error;
  return (data ?? []).map(mapRecordRow);
}

export async function deleteRecord(recordId: string): Promise<void> {
  const { error } = await supabase.from('jump_records').delete().eq('id', recordId);
  if (error) throw error;
}

/**
 * Fixes a mistyped count in place, instead of the only previous option
 * (delete + re-add). `currentRecords` is the already-loaded records list --
 * same pattern as batchSaveRecords -- used to recompute which record is the
 * true personal best for that student+event after the edit, so a typo fix
 * doesn't leave the is_personal_best flag on the wrong row.
 */
export async function updateRecordCount(
  recordId: string,
  count: number,
  currentRecords: JumpRecord[]
): Promise<JumpRecord> {
  const target = currentRecords.find((r) => r.id === recordId);
  if (!target) throw new Error('기록을 찾을 수 없습니다.');

  const sameEventRecords = currentRecords
    .filter((r) => r.studentId === target.studentId && r.eventKey === target.eventKey)
    .map((r) => (r.id === recordId ? { ...r, count } : r));
  sameEventRecords.sort((a, b) => b.count - a.count || new Date(b.date).getTime() - new Date(a.date).getTime());
  const newBestId = sameEventRecords[0]?.id;

  const { error: updateError } = await supabase
    .from('jump_records')
    .update({ count, is_personal_best: recordId === newBestId })
    .eq('id', recordId);
  if (updateError) throw updateError;

  const staleBestIds = sameEventRecords
    .filter((r) => r.id !== newBestId && r.id !== recordId && r.isPersonalBest)
    .map((r) => r.id);
  if (staleBestIds.length > 0) {
    const { error: clearError } = await supabase
      .from('jump_records')
      .update({ is_personal_best: false })
      .in('id', staleBestIds);
    if (clearError) throw clearError;
  }

  const { data, error } = await supabase
    .from('jump_records')
    .select('*, students(name)')
    .eq('id', recordId)
    .single();
  if (error) throw error;
  return mapRecordRow(data);
}
