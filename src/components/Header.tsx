import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Tv, ClipboardEdit, Timer, LogOut, Share2, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GymNameModal } from './GymNameModal';

interface HeaderProps {
  activeView: 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'TIMER';
  setActiveView: (view: 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'TIMER') => void;
  gymName: string;
  studentCount: number;
  totalRecordCount: number;
  onOpenSelectedCertificate?: () => void;
}

const NAV_ITEMS: Array<{
  view: 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'TIMER';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
  idleClass: string;
}> = [
  {
    view: 'LEADERBOARD',
    label: '실시간 랭킹보드',
    icon: Trophy,
    activeClass: 'bg-orange-500 text-white shadow-sm shadow-orange-500/30',
    idleClass: 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
  },
  {
    view: 'ADMIN_BATCH',
    label: '일괄등록',
    icon: ClipboardEdit,
    activeClass: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30',
    idleClass: 'text-emerald-700 hover:text-emerald-900 hover:bg-white/60',
  },
  {
    view: 'TV_MODE',
    label: 'TV 전광판',
    icon: Tv,
    activeClass: 'bg-purple-600 text-white shadow-sm shadow-purple-600/30',
    idleClass: 'text-purple-700 hover:text-purple-900 hover:bg-white/60',
  },
  {
    view: 'TIMER',
    label: '스피드 타이머',
    icon: Timer,
    activeClass: 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30',
    idleClass: 'text-cyan-700 hover:text-cyan-900 hover:bg-white/60',
  },
];

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  gymName,
  studentCount,
  totalRecordCount,
}) => {
  const { user, gym, signOut, updateGymName } = useAuth();
  const [showRenameModal, setShowRenameModal] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-slate-900 px-4 lg:px-8 py-3.5 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* Row 1: Brand + Account */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => setActiveView('LEADERBOARD')}
              className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer min-w-0"
            >
              <div className="w-10 h-10 shrink-0 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                {gymName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 whitespace-nowrap truncate">
                    {gymName}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 uppercase whitespace-nowrap shrink-0">
                    RANKING
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium tracking-wide whitespace-nowrap truncate">
                  {studentCount}명 수련생 · {totalRecordCount}건 기록
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setShowRenameModal(true)}
              title="체육관 이름 변경"
              className="p-1.5 text-slate-300 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {gym && (
              <Link
                to={`/g/${gym.slug}`}
                target="_blank"
                rel="noreferrer"
                title="학부모님 공개 랭킹보드 링크 (로그인 불필요)"
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">공개 링크</span>
              </Link>
            )}
            <div
              title={user?.email}
              className="hidden md:flex px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-extrabold border border-amber-300 items-center gap-1.5 shadow-2xs max-w-[9rem] truncate whitespace-nowrap"
            >
              <span className="truncate">{user?.email}</span>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="로그아웃"
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>

        {/* Row 2: Navigation */}
        <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto">
          {NAV_ITEMS.map(({ view, label, icon: Icon, activeClass, idleClass }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === view ? activeClass : idleClass
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {gym && (
        <GymNameModal
          isOpen={showRenameModal}
          currentName={gym.name}
          onSave={updateGymName}
          onClose={() => setShowRenameModal(false)}
        />
      )}
    </header>
  );
};
