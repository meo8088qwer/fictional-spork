import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Tv, ClipboardEdit, LogOut, Share2, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GymNameModal } from './GymNameModal';

interface HeaderProps {
  activeView: 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE';
  setActiveView: (view: 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE') => void;
  gymName: string;
  studentCount: number;
  totalRecordCount: number;
}

const NAV_ITEMS: Array<{
  view: 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { view: 'LEADERBOARD', label: '랭킹보드', icon: Trophy },
  { view: 'ADMIN_BATCH', label: '기록 관리', icon: ClipboardEdit },
  { view: 'TV_MODE', label: 'TV 전광판', icon: Tv },
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
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200/80 flex flex-col">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView('LEADERBOARD')}
            className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
          >
            <div className="w-10 h-10 shrink-0 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-white text-lg">
              {gymName.charAt(0)}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm text-slate-900 truncate block">{gymName}</span>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {studentCount}명 · {totalRecordCount}건
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setShowRenameModal(true)}
            title="체육관 이름 변경"
            className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeView === view
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100 space-y-1.5">
        {gym && (
          <Link
            to={`/g/${gym.slug}`}
            target="_blank"
            rel="noreferrer"
            title="학부모님 공개 랭킹보드 링크 (로그인 불필요)"
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>공개 링크</span>
          </Link>
        )}
        <div
          title={user?.email}
          className="px-3 py-2 rounded-xl bg-slate-50 text-slate-500 text-xs font-medium truncate"
        >
          {user?.email}
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </div>

      {gym && (
        <GymNameModal
          isOpen={showRenameModal}
          currentName={gym.name}
          onSave={updateGymName}
          onClose={() => setShowRenameModal(false)}
        />
      )}
    </aside>
  );
};
