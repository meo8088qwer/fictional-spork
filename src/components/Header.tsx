import React, { useState } from 'react';
import { Trophy, Tv, ClipboardEdit, Timer, RotateCcw, LogOut } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  activeView: 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'TIMER';
  setActiveView: (view: 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'TIMER') => void;
  gymName: string;
  studentCount: number;
  totalRecordCount: number;
  onResetData: () => void;
  onOpenSelectedCertificate?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  gymName,
  studentCount,
  totalRecordCount,
  onResetData,
}) => {
  const { user, signOut } = useAuth();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-slate-900 px-4 lg:px-8 py-3.5 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Gym Status */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          <button
            onClick={() => setActiveView('LEADERBOARD')}
            className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
          >
            <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              {gymName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">
                  {gymName}
                </span>
                <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 uppercase">
                  RANKING
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide">
                {gymName} 스피드 측정 랭킹보드
              </p>
            </div>
          </button>

          {/* Quick Counter & Live Status Pills */}
          <div className="hidden lg:flex items-center gap-3 border-l border-slate-200 pl-4 text-xs">
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Gym Status</p>
              <p className="text-xs text-emerald-700 flex items-center gap-1.5 font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> LIVE SYNC ACTIVE
              </p>
            </div>
            <div className="h-7 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-2.5 font-semibold text-slate-600 text-[11px]">
              <span>수련생: <strong className="text-orange-600 font-bold">{studentCount}명</strong></span>
              <span>기록: <strong className="text-amber-600 font-bold">{totalRecordCount}건</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center justify-between md:justify-end gap-2 overflow-x-auto pb-1 md:pb-0">
          <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveView('LEADERBOARD')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeView === 'LEADERBOARD'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>실시간 랭킹보드</span>
            </button>

            <button
              onClick={() => setActiveView('ADMIN_BATCH')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeView === 'ADMIN_BATCH'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-emerald-700 hover:text-emerald-900 hover:bg-white/60'
              }`}
            >
              <ClipboardEdit className="w-3.5 h-3.5" />
              <span>일괄등록</span>
            </button>

            <button
              onClick={() => setActiveView('TV_MODE')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeView === 'TV_MODE'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                  : 'text-purple-700 hover:text-purple-900 hover:bg-white/60'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV 전광판</span>
            </button>

            <button
              onClick={() => setActiveView('TIMER')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeView === 'TIMER'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                  : 'text-cyan-700 hover:text-cyan-900 hover:bg-white/60'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>스피드 타이머</span>
            </button>
          </nav>

          {/* Account status */}
          <div className="flex items-center gap-1.5 pl-1">
            <div
              title={user?.email}
              className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-extrabold border border-amber-300 flex items-center gap-1.5 shadow-2xs max-w-[10rem] truncate"
            >
              <span className="truncate">{user?.email}</span>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="로그아웃"
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              title="기초 데모 데이터로 초기화"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200/80 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        title="샘플 데이터 초기화"
        message="체육관 수련생 명단 및 측정 기록을 기초 샘플 데이터로 초기화하시겠습니까?"
        confirmText="초기화 실행"
        variant="warning"
        onConfirm={onResetData}
        onClose={() => setShowResetConfirm(false)}
      />
    </header>
  );
};

