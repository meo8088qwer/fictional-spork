import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { fetchOpsGymList, OpsGymListItem } from '../data/api/ops';
import { listLeagueSeasons, createLeagueSeason, LeagueScoringMode } from '../data/api/league';
import { DebouncedSearchInput } from './DebouncedSearchInput';

const SCORING_MODE_LABEL: Record<LeagueScoringMode, string> = {
  existing_records: '기존 기록 이어서 (라운드 기간 동안의 최고기록)',
  new_measurement: '새로 측정 (기존 기록에 영향 없음)',
};

export const LeagueSeasonManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [gymSearch, setGymSearch] = useState('');
  const [selectedGymIds, setSelectedGymIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [scoringMode, setScoringMode] = useState<LeagueScoringMode>('existing_records');
  const [roundDays, setRoundDays] = useState(30);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const gymListQuery = useQuery({
    queryKey: ['ops', 'leagueGymPicker', gymSearch],
    queryFn: () => fetchOpsGymList(gymSearch, 30, 0),
  });

  const seasonsQuery = useQuery({
    queryKey: ['league', 'seasons'],
    queryFn: listLeagueSeasons,
  });

  const toggleGym = (id: string) => {
    setSelectedGymIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedGymIds.length < 2) return;
    setIsCreating(true);
    setMessage(null);
    try {
      await createLeagueSeason({
        name: name.trim(),
        gymIds: selectedGymIds,
        scoringMode,
        roundDays,
        startDate,
      });
      setMessage({ type: 'success', text: '시즌이 생성됐어요.' });
      setName('');
      setSelectedGymIds([]);
      queryClient.invalidateQueries({ queryKey: ['league', 'seasons'] });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '시즌 생성에 실패했어요.' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
        <Trophy className="w-4 h-4 text-slate-400" />
        리그전 관리
      </h2>

      <div className="space-y-3 mb-5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="시즌 이름 (예: 2026 겨울 리그)"
          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 pl-1">라운드 기간 (일)</label>
            <input
              type="number"
              min={1}
              value={roundDays}
              onChange={(e) => setRoundDays(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 pl-1">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {(Object.keys(SCORING_MODE_LABEL) as LeagueScoringMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setScoringMode(mode)}
              className={`flex-1 px-3 py-2 rounded-xl text-[11px] font-bold text-left transition-all cursor-pointer border ${
                scoringMode === mode
                  ? 'bg-[#1B5E20] text-white border-[#1B5E20]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {SCORING_MODE_LABEL[mode]}
            </button>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-400 pl-1">
              참가 체육관 선택 ({selectedGymIds.length}개, 최소 2개)
            </label>
            <DebouncedSearchInput
              type="text"
              value={gymSearch}
              onChange={setGymSearch}
              placeholder="체육관 검색..."
              className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {gymListQuery.isLoading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : (
              gymListQuery.data?.items.map((g: OpsGymListItem) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedGymIds.includes(g.id)}
                    onChange={() => toggleGym(g.id)}
                    className="accent-[#1B5E20]"
                  />
                  <span className="font-bold text-slate-800">{g.name}</span>
                  <span className="text-slate-400">학생 {g.studentCount}명</span>
                </label>
              ))
            )}
            {gymListQuery.data?.items.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">검색 결과가 없어요.</div>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20]'
                : 'bg-rose-50 border border-rose-200 text-rose-600'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <button
          type="button"
          disabled={isCreating || !name.trim() || selectedGymIds.length < 2}
          onClick={handleCreate}
          className="w-full py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer"
        >
          {isCreating ? '생성 중...' : '시즌 생성'}
        </button>
      </div>

      <h3 className="text-xs font-bold text-slate-600 mb-2">기존 시즌</h3>
      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
        {seasonsQuery.isLoading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : (
          seasonsQuery.data?.map((s) => (
            <a
              key={s.id}
              href={`/league/${s.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50"
            >
              <div>
                <span className="font-bold text-slate-800">{s.name}</span>
                <span className="text-slate-400 ml-2">
                  체육관 {s.gymCount}개 · {s.roundsCount}라운드
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          ))
        )}
        {seasonsQuery.data?.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400 font-medium">아직 생성된 시즌이 없어요.</div>
        )}
      </div>
    </section>
  );
};
