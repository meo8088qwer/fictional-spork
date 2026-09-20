import { supabase } from '../../lib/supabaseClient';

export type LeagueScoringMode = 'existing_records' | 'new_measurement';

export interface LeagueSeasonSummary {
  id: string;
  name: string;
  scoringMode: LeagueScoringMode;
  status: 'active' | 'completed' | 'canceled';
  startDate: string;
  roundsCount: number;
  gymCount: number;
}

export interface LeagueClubStanding {
  gymId: string;
  gymName: string;
  totalScore: number;
  roundScores: number[];
  dominance: number;
}

export interface LeagueAthlete {
  studentId: string;
  name: string;
  grade: string;
  gymId: string;
  gymName: string;
  totalPoints: number;
}

export interface LeagueStandings {
  season: { id: string; name: string; scoringMode: LeagueScoringMode; roundsCount: number };
  clubs: LeagueClubStanding[];
  athletes: LeagueAthlete[];
}

export async function listLeagueSeasons(): Promise<LeagueSeasonSummary[]> {
  const { data, error } = await supabase.rpc('list_league_seasons');
  if (error) throw error;
  return (data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    scoringMode: s.scoring_mode,
    status: s.status,
    startDate: s.start_date,
    roundsCount: s.rounds_count,
    gymCount: s.gym_count,
  }));
}

export async function getLeagueStandings(seasonId: string): Promise<LeagueStandings> {
  const { data, error } = await supabase.rpc('get_league_standings', { p_season_id: seasonId });
  if (error) throw error;
  return data as LeagueStandings;
}

// Platform-admin-only -- ops_list_gyms/create_league_season both re-check
// is_platform_admin() server-side, so this is safe to call from the ops
// dashboard without a separate client-side gate.
export async function createLeagueSeason(params: {
  name: string;
  gymIds: string[];
  scoringMode: LeagueScoringMode;
  roundDays: number;
  startDate: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_league_season', {
    p_name: params.name,
    p_gym_ids: params.gymIds,
    p_scoring_mode: params.scoringMode,
    p_round_days: params.roundDays,
    p_start_date: params.startDate,
  });
  if (error) throw error;
  return data as string;
}

export async function submitLeagueMatchRecord(params: {
  matchId: string;
  studentId: string;
  eventKey: string;
  count: number;
}): Promise<void> {
  const { error } = await supabase.rpc('submit_league_match_record', {
    p_match_id: params.matchId,
    p_student_id: params.studentId,
    p_event_key: params.eventKey,
    p_count: params.count,
  });
  if (error) throw error;
}
