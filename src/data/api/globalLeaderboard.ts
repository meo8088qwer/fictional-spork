import { supabase } from '../../lib/supabaseClient';
import { EventKey, GradeGroup } from '../../types';

export interface GlobalLeaderboardEntry {
  eventKey: EventKey;
  count: number;
  recordDate: string;
  studentName: string;
  grade: GradeGroup;
  gymName: string;
}

/**
 * Cross-gym personal bests via the get_global_leaderboard SECURITY DEFINER
 * RPC (supabase/migrations/0007_global_leaderboard_rpc.sql). Login required
 * (granted to `authenticated` only); free-plan gyms' students are excluded
 * server-side, not filtered here.
 */
export async function fetchGlobalLeaderboard(): Promise<GlobalLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_global_leaderboard');
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    eventKey: row.event_key,
    count: row.count,
    recordDate: row.record_date,
    studentName: row.student_name,
    grade: row.grade,
    gymName: row.gym_name,
  }));
}
