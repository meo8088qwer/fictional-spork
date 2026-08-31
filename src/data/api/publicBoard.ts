import { supabase } from '../../lib/supabaseClient';
import { Student, JumpRecord, EventMeta, GradeGroup } from '../../types';
import { mapEventRow } from './events';

export interface PublicBoard {
  gymName: string;
  gymSlug: string;
  events: Record<string, EventMeta>;
  students: Student[];
  records: JumpRecord[];
}

function mapStudentRow(row: any): Student {
  return {
    id: row.id,
    studentNo: row.student_no,
    name: row.name,
    grade: row.grade as GradeGroup,
    gender: row.gender,
    avatarColor: row.avatar_color,
    // The public payload deliberately omits join date/notes/branch --
    // nothing reachable from the public board renders them.
    joinDate: '',
  };
}

/**
 * Fetches one gym's public leaderboard/TV-mode data via the
 * get_public_board SECURITY DEFINER RPC (see
 * supabase/migrations/0004_public_board_rpc.sql) -- no login required,
 * and no direct table access is granted to the anon role.
 */
export async function fetchPublicBoard(gymSlug: string): Promise<PublicBoard> {
  const { data, error } = await supabase.rpc('get_public_board', { p_gym_slug: gymSlug });
  if (error) throw error;

  const events: Record<string, EventMeta> = {};
  for (const row of data.events ?? []) {
    events[row.key] = mapEventRow(row);
  }

  const students: Student[] = (data.students ?? []).map(mapStudentRow);
  const studentNameById = new Map(students.map((s) => [s.id, s.name]));

  const records: JumpRecord[] = (data.records ?? []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: studentNameById.get(row.student_id) ?? '',
    eventKey: row.event_key,
    count: row.count,
    date: row.record_date,
    isPersonalBest: row.is_personal_best,
  }));

  return {
    gymName: data.gym.name,
    gymSlug: data.gym.slug,
    events,
    students,
    records,
  };
}

/**
 * Fetches one student's full record history via get_public_student_history
 * (see supabase/migrations/0015_public_student_history_rpc.sql) -- used only
 * when a parent opens that student's profile modal, since get_public_board's
 * `records` is trimmed to current-bests only (it's what's re-fetched every
 * 15s by the board/TV poll, and the leaderboard never needed more than
 * that -- see 0014's migration comment).
 */
export async function fetchPublicStudentHistory(
  gymSlug: string,
  studentId: string,
  studentName: string
): Promise<JumpRecord[]> {
  const { data, error } = await supabase.rpc('get_public_student_history', {
    p_gym_slug: gymSlug,
    p_student_id: studentId,
  });
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentName,
    eventKey: row.event_key,
    count: row.count,
    date: row.record_date,
    isPersonalBest: row.is_personal_best,
  }));
}
