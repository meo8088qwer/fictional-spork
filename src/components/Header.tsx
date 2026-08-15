import React, { useState } from 'react';
import { Trophy, Tv, ClipboardEdit, Timer, RotateCcw, Lock, Unlock, Key } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface HeaderProps {
  activeView: 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'TIMER';
  setActiveView: (view: 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'TIMER') => void;
  studentCount: number;
  totalRecordCount: number;
  isAdmin: boolean;
  onAdminLoginReq: () => void;
  onAdminLogout: () => void;
  onOpenPasswordChange: () => void;
  onResetData: () => void;
  onOpenSelectedCertificate?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  studentCount,
  totalRecordCount,
  isAdmin,
  onAdminLoginReq,
  onAdminLogout,
  onOpenPasswordChange,
  onResetData,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleAdminBatchClick = () => {
    if (isAdmin) {
      setActiveView('ADMIN_BATCH');
    } else {
      onAdminLoginReq();
    }
  };

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
              용
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">
                  용인대 <span className="text-orange-500">파워점핑줄넘기</span>
                </span>
                <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 uppercase">
                  RANKING
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide">
                용인대 파워점핑줄넘기 스피드 측정 랭킹board
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

            {/* Admin Batch Entry Button with Lock Badge if lock */}
            <button
              onClick={handleAdminBatchClick}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeView === 'ADMIN_BATCH'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-emerald-700 hover:text-emerald-900 hover:bg-white/60'
              }`}
            >
              <ClipboardEdit className="w-3.5 h-3.5" />
              <span>일괄등록 (관리자)</span>
              {!isAdmin && (
                <Lock className="w-3 h-3 text-amber-600 shrink-0 ml-0.5" />
              )}
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

          {/* Admin Mode Lock/Unlock Status Badge */}
          <div className="flex items-center gap-1.5 pl-1">
            {isAdmin ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenPasswordChange}
                  title="비밀번호 변경"
                  className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">비번변경</span>
                </button>
                <button
                  type="button"
                  onClick={onAdminLogout}
                  title="관리자 로그아웃 (학부모 모드로 전환)"
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-extrabold transition-all border border-amber-300 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                  <span>관장님 인증됨</span>
                  <span className="text-[10px] text-amber-600 underline ml-0.5">로그아웃</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onAdminLoginReq}
                title="관장님 관리자 로그인"
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-800 text-xs font-bold transition-all border border-slate-200 hover:border-amber-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>관장님 로그인</span>
              </button>
            )}

            {/* Data Reset Button (Admin only or prompt) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                title="기초 데모 데이터로 초기화"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200/80 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
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

