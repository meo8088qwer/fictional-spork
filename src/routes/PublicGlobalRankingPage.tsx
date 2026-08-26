import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trophy, ArrowLeft } from 'lucide-react';
import { GlobalLeaderboard } from '../components/GlobalLeaderboard';

export default function PublicGlobalRankingPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-900 font-sans antialiased">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link
            to={`/g/${slug}`}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>랭킹보드로 돌아가기</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <GlobalLeaderboard />
      </main>

      <footer className="max-w-7xl mx-auto px-4 lg:px-8 py-6 text-center text-xs text-slate-400">
        <Trophy className="w-4 h-4 inline mr-1 -mt-0.5" />
        Powered by 줄넘기 실시간 랭킹보드
      </footer>
    </div>
  );
}
