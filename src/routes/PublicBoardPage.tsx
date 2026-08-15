import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tv, Trophy } from 'lucide-react';
import { fetchPublicBoard } from '../data/api/publicBoard';
import { getLeaderboardData } from '../lib/scoring';
import { EventSelector } from '../components/EventSelector';
import { Podium } from '../components/Podium';
import { Leaderboard } from '../components/Leaderboard';
import { DisplayTab, TimeFilter, GradeCategoryFilter } from '../types';

export default function PublicBoardPage() {
  const { slug } = useParams<{ slug: string }>();

  const [activeTab, setActiveTab] = useState<DisplayTab>('OVERALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [gradeFilter, setGradeFilter] = useState<GradeCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const query = useQuery({
    queryKey: ['publicBoard', slug],
    queryFn: () => fetchPublicBoard(slug!),
    enabled: !!slug,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (query.data) {
      document.title = `${query.data.gymName} 실시간 랭킹보드`;
    }
  }, [query.data?.gymName]);

  if (query.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8]">
        <span className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8] p-4">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 shadow-lg text-center">
          <h2 className="text-lg font-black text-slate-900 mb-2">체육관을 찾을 수 없습니다</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            주소를 다시 확인해 주세요. (/g/체육관주소)
          </p>
        </div>
      </div>
    );
  }

  const board = query.data;
  const leaderboardItems = getLeaderboardData(
    board.students,
    board.records,
    activeTab,
    gradeFilter,
    searchQuery,
    board.events
  );
  const topThree = leaderboardItems.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-900 font-sans antialiased">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md shadow-orange-500/20">
              {board.gymName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">
                  {board.gymName}
                </span>
                <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 uppercase">
                  RANKING
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">실시간 랭킹보드</p>
            </div>
          </div>
          <Link
            to={`/g/${board.gymSlug}/tv`}
            className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-extrabold transition-all flex items-center gap-1.5"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV 전광판 모드</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <EventSelector
          gymName={board.gymName}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          events={board.events}
        />

        <Podium topThree={topThree} activeTab={activeTab} onSelectStudent={() => {}} />

        <Leaderboard
          items={leaderboardItems}
          events={board.events}
          activeTab={activeTab}
          gradeFilter={gradeFilter}
          setGradeFilter={setGradeFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectStudent={() => {}}
        />
      </main>

      <footer className="max-w-7xl mx-auto px-4 lg:px-8 py-6 text-center text-xs text-slate-400">
        <Trophy className="w-4 h-4 inline mr-1 -mt-0.5" />
        Powered by 줄넘기 실시간 랭킹보드
      </footer>
    </div>
  );
}
