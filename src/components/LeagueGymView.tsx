import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Swords, Trophy, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import {
  getMyLeagueMatches,
  getMyLeagueMatchEntries,
  submitLeagueMatchRecord,
  MyLeagueMatch,
} from '../data/api/league';
import { DEFAULT_EVENTS } from '../data/constants';
import { Student } from '../types';

interface LeagueGymViewProps {
  students: Student[];
}

const EVENT_OPTIONS = Object.values(DEFAULT_EVENTS);

function MatchEntryPanel({ match, students }: { match: MyLeagueMatch; students: Student[] }) {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const [eventKey, setEventKey] = useState(EVENT_OPTIONS[0]?.key ?? '');
  const [count, setCount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const entriesQuery = useQuery({
    queryKey: ['league', 'myMatchEntries', match.matchId],
    queryFn: () => getMyLeagueMatchEntries(match.matchId!),
    enabled: !!match.matchId,
  });

  const handleSubmit = async () => {
    if (!match.matchId || !studentId || !eventKey || !count) return;
    const parsed = Number(count);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage({ type: 'error', text: '올바른 기록을 입력해 주세요.' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      await submitLeagueMatchRecord({ matchId: match.matchId, studentId, eventKey, count: parsed });
      setMessage({ type: 'success', text: '저장됐어요.' });
      setCount('');
      queryClient.invalidateQueries({ queryKey: ['league', 'myMatchEntries', match.matchId] });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '저장 중 오류가 발생했어요.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_80px] gap-2">
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">학생 선택</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={eventKey}
          onChange={(e) => setEventKey(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {EVENT_OPTIONS.map((ev) => (
            <option key={ev.key} value={ev.key}>
              {ev.shortTitle}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          placeholder="기록"
          className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button
          type="button"
          disabled={isSaving || !studentId || !count}
          onClick={handleSubmit}
          className="px-3 py-2 rounded-lg bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>

      {message && (
        <div
          className={`p-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${
            message.type === 'success'
              ? 'bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20]'
              : 'bg-rose-50 border border-rose-200 text-rose-600'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div>
        <div className="text-[10px] font-bold text-slate-400 mb-1.5">우리 체육관이 입력한 기록</div>
        {entriesQuery.isLoading ? (
          <div className="text-[11px] text-slate-400">불러오는 중...</div>
        ) : entriesQuery.data && entriesQuery.data.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {entriesQuery.data.map((e, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700"
              >
                {e.studentName} · {DEFAULT_EVENTS[e.eventKey]?.shortTitle ?? e.eventKey} {e.count}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400">아직 입력한 기록이 없어요.</div>
        )}
      </div>
    </div>
  );
}

export const LeagueGymView: React.FC<LeagueGymViewProps> = ({ students }) => {
  const { data, isLoading, error } = useQuery({ queryKey: ['league', 'myMatches'], queryFn: getMyLeagueMatches });
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 font-medium bg-white border border-slate-200 rounded-xl">
        불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-xs text-rose-500 font-medium bg-white border border-rose-200 rounded-xl">
        리그 정보를 불러오지 못했어요.
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-10 text-center bg-white border border-slate-200 rounded-xl">
        <Swords className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600 mb-1">아직 참가 중인 리그전이 없어요.</p>
        <p className="text-xs text-slate-400 font-medium">관장님(운영팀)에게 문의해서 시즌에 참가해 보세요.</p>
      </div>
    );
  }

  const seasons = Array.from(new Map(data.map((m) => [m.seasonId, m])).values());

  return (
    <div className="space-y-5">
      {seasons.map((season) => {
        const rounds = data.filter((m) => m.seasonId === season.seasonId).sort((a, b) => a.roundNo - b.roundNo);
        return (
          <div key={season.seasonId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#1B5E20]" />
                <span className="text-sm font-bold text-slate-900">{season.seasonName}</span>
                <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                  {season.scoringMode === 'new_measurement' ? '리그 전용 측정' : '기존 기록 사용'}
                </span>
              </div>
              <a
                href={`/league/${season.seasonId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
              >
                순위 보기 <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {rounds.map((round) => {
              const isBye = !round.matchId;
              const isOpen = expandedMatchId === round.matchId;
              return (
                <div key={round.roundNo} className="border-b border-slate-100 last:border-b-0">
                  <button
                    type="button"
                    disabled={isBye || round.scoringMode !== 'new_measurement'}
                    onClick={() => setExpandedMatchId(isOpen ? null : round.matchId)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${
                      isBye ? 'cursor-default' : 'hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[11px] font-bold">
                        {round.roundNo}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {isBye ? '부전승 (이번 라운드는 쉬어요)' : `vs ${round.opponentGymName}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {round.startDate} ~ {round.endDate}
                        </div>
                      </div>
                    </div>
                    {!isBye && round.scoringMode === 'new_measurement' && (
                      <span className="shrink-0 text-slate-400">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    )}
                  </button>
                  {isOpen && !isBye && round.scoringMode === 'new_measurement' && (
                    <MatchEntryPanel match={round} students={students} />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
