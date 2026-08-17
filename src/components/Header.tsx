import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Tv, ClipboardEdit, LogOut, Share2, UserCog, Menu, X, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AdminView = 'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'PRICING' | 'MYPAGE';

interface HeaderProps {
  activeView: AdminView;
  setActiveView: (view: AdminView) => void;
  gymName: string;
  studentCount: number;
  totalRecordCount: number;
}

const NAV_ITEMS: Array<{
  view: AdminView;
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
  const { user, gym, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goTo = (view: AdminView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile top bar (sidebar becomes a slide-in drawer below lg) */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b border-slate-200/80 px-4 py-3">
        <button
          onClick={() => goTo('LEADERBOARD')}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer"
        >
          <div className="w-8 h-8 shrink-0 bg-[#1B5E20] rounded-lg flex items-center justify-center font-bold text-white text-sm">
            {gymName.charAt(0)}
          </div>
          <span className="font-bold text-sm text-slate-900 truncate max-w-[45vw]">{gymName}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`w-60 shrink-0 bg-white border-r border-slate-200/80 flex flex-col fixed lg:sticky top-0 left-0 h-screen z-50 transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo('LEADERBOARD')}
              className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
            >
              <div className="w-10 h-10 shrink-0 bg-[#1B5E20] rounded-xl flex items-center justify-center font-bold text-white text-lg">
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
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              onClick={() => goTo(view)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeView === view
                  ? 'bg-[#1B5E20] text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
          {gym && (
            <Link
              to={`/g/${gym.slug}`}
              target="_blank"
              rel="noreferrer"
              title="학부모님 공개 랭킹보드 링크 (로그인 불필요)"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Share2 className="w-4 h-4" />
              <span>공개 링크</span>
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-1.5">
          <button
            type="button"
            onClick={() => goTo('PRICING')}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'PRICING'
                ? 'bg-[#1B5E20] text-white'
                : 'bg-[#E8F5E9] text-[#1B5E20] hover:bg-[#A5D6A7]/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>요금제</span>
          </button>
          <button
            type="button"
            onClick={() => goTo('MYPAGE')}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'MYPAGE'
                ? 'bg-[#1B5E20] text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <UserCog className="w-3.5 h-3.5" />
            <span>마이페이지</span>
          </button>
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
      </aside>
    </>
  );
};
