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

export async function listRecords(gymId: string): Promise<JumpRecord[]> {
  const { data, error } = await supabase
    .from('jump_records')
    .select('*, students(name)')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRecordRow);
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
