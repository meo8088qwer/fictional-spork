import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Trophy, ArrowLeft, Crown, Users } from 'lucide-react';
import { getLeagueStandings, LeagueClubStanding } from '../data/api/league';

const LINE_COLORS = ['#1B5E20', '#2563EB', '#EA580C', '#0D9488', '#DB2777', '#7C3AED', '#CA8A04', '#475569'];

type Tab = 'STANDINGS' | 'CLUBS' | 'ATHLETES';

function PodiumCard({ club, rank }: { club: LeagueClubStanding; rank: 1 | 2 | 3 }) {
  const isFirst = rank === 1;
  const medal = [
    { ring: 'border-amber-400', badge: 'from-amber-300 to-amber-500' },
    { ring: 'border-slate-300', badge: 'from-slate-300 to-slate-400' },
    { ring: 'border-orange-400', badge: 'from-orange-300 to-orange-500' },
  ][rank - 1];

  return (
    <div
      className={`rounded-2xl bg-white border-2 ${medal.ring} shadow-md p-5 text-center ${
        isFirst ? 'sm:-translate-y-4' : ''
      }`}
    >
      {isFirst && <Crown className="w-6 h-6 text-amber-500 mx-auto mb-1" />}
      <div
        className={`mx-auto mb-2 w-11 h-11 rounded-full bg-gradient-to-br ${medal.badge} flex items-center justify-center text-white font-bold text-sm shadow`}
      >
        {rank}
      </div>
      <div className="text-sm font-bold text-slate-900 truncate">{club.gymName}</div>
      <div className="text-xl font-bold text-[#1B5E20] mt-1">
        {club.totalScore.toLocaleString()}
        <span className="text-xs font-bold text-slate-400 ml-1">점</span>
      </div>
    </div>
  );
}

export default function LeagueSeasonPage() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const [tab, setTab] = useState<Tab>('STANDINGS');
  const [athleteClubFilter, setAthleteClubFilter] = useState<string>('ALL');

  const { data, isLoading, error } = useQuery({
    queryKey: ['league-standings', seasonId],
    queryFn: () => getLeagueStandings(seasonId!),
    enabled: !!seasonId,
  });

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-900 font-sans antialiased">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link
            to="/"
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ROPERANK</span>
          </Link>
          {data && <span className="text-sm font-bold text-slate-900 truncate">{data.season.name}</span>}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-400 font-medium bg-white border border-slate-200 rounded-xl">
            불러오는 중...
          </div>
        ) : error || !data ? (
          <div className="p-10 text-center text-xs text-rose-500 font-medium bg-white border border-rose-200 rounded-xl">
            시즌 정보를 불러오지 못했어요.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-6">
              {[
                { key: 'STANDINGS' as const, label: '종합순위' },
                { key: 'CLUBS' as const, label: '체육관 현황' },
                { key: 'ATHLETES' as const, label: '개인기록' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tab === t.key ? 'bg-[#1B5E20] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'STANDINGS' && (
              <div>
                {data.clubs.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 items-end">
                    {[data.clubs[1], data.clubs[0], data.clubs[2]].map((club, i) =>
                      club ? (
                        <PodiumCard key={club.gymId} club={club} rank={([2, 1, 3] as const)[i]} />
                      ) : (
                        <div key={i} />
                      )
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                      <span className="w-1 h-4 bg-[#1B5E20] rounded-full" />
                      <h2 className="text-xs font-bold text-slate-700">종합 리더보드</h2>
                    </div>
                    {data.clubs.map((club, i) => (
                      <div
                        key={club.gymId}
                        className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0"
                      >
                        <span
                          className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-bold text-slate-900 truncate">{club.gymName}</span>
                        <span className="text-sm font-bold text-slate-900 shrink-0">{club.totalScore.toLocaleString()}점</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1 h-4 bg-[#1B5E20] rounded-full" />
                      <h2 className="text-xs font-bold text-slate-700">라운드별 추이</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="round"
                          type="category"
                          allowDuplicatedCategory={false}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v}차`}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `${v}점`} labelFormatter={(v) => `${v}차`} />
                        {data.clubs.map((club, i) => (
                          <Line
                            key={club.gymId}
                            data={club.roundScores.map((score, idx) => ({ round: idx + 1, [club.gymName]: score }))}
                            type="monotone"
                            dataKey={club.gymName}
                            name={club.gymName}
                            stroke={LINE_COLORS[i % LINE_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      {data.clubs.map((club, i) => (
                        <span key={club.gymId} className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
                          />
                          {club.gymName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'CLUBS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.clubs.map((club, i) => (
                  <div key={club.gymId} className="bg-white border border-slate-200 rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          #{i + 1}
                        </span>
                        <span className="text-sm font-bold text-slate-900 truncate">{club.gymName}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 shrink-0">{club.totalScore.toLocaleString()}점</span>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>DOMINANCE</span>
                        <span>{club.dominance}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1B5E20] rounded-full"
                          style={{ width: `${Math.min(100, club.dominance)}%` }}
                        />
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={110}>
                      <BarChart data={club.roundScores.map((score, idx) => ({ round: `${idx + 1}차`, score }))}>
                        <XAxis dataKey="round" tick={{ fontSize: 10 }} />
                        <YAxis hide />
                        <Tooltip formatter={(v: number) => `${v}점`} />
                        <Bar dataKey="score" fill="#1B5E20" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}

            {tab === 'ATHLETES' && (
              <div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <button
                    type="button"
                    onClick={() => setAthleteClubFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      athleteClubFilter === 'ALL' ? 'bg-[#1B5E20] text-white' : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    전체
                  </button>
                  {data.clubs.map((club) => (
                    <button
                      key={club.gymId}
                      type="button"
                      onClick={() => setAthleteClubFilter(club.gymId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        athleteClubFilter === club.gymId
                          ? 'bg-[#1B5E20] text-white'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {club.gymName}
                    </button>
                  ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[40px_1fr_90px] sm:grid-cols-[40px_1fr_140px_80px] gap-2 px-4 py-2.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                    <span>순위</span>
                    <span>이름</span>
                    <span className="hidden sm:block">체육관</span>
                    <span className="text-right">점수</span>
                  </div>
                  {data.athletes
                    .filter((a) => athleteClubFilter === 'ALL' || a.gymId === athleteClubFilter)
                    .map((a, i) => (
                      <div
                        key={a.studentId}
                        className="grid grid-cols-[40px_1fr_90px] sm:grid-cols-[40px_1fr_140px_80px] gap-2 items-center px-4 py-2.5 border-b border-slate-100 last:border-b-0"
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{a.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium sm:hidden truncate">{a.gymName}</div>
                        </span>
                        <span className="hidden sm:block text-xs text-slate-500 font-medium truncate">{a.gymName}</span>
                        <span className="text-sm font-bold text-slate-900 text-right">{a.totalPoints}</span>
                      </div>
                    ))}
                  {data.athletes.filter((a) => athleteClubFilter === 'ALL' || a.gymId === athleteClubFilter).length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400 font-medium">아직 기록이 없어요.</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 lg:px-8 py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <Trophy className="w-4 h-4" />
        Powered by ROPERANK
        <Users className="w-3.5 h-3.5 ml-2" />
        {data ? `참가 체육관 ${data.clubs.length}곳` : ''}
      </footer>
    </div>
  );
}
