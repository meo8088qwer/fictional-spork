import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Tv, ClipboardEdit, Share2, TrendingUp, Award, Check } from 'lucide-react';

const FEATURES = [
  {
    icon: Trophy,
    title: '실시간 랭킹보드',
    description: '종목별·종합 랭킹이 기록 입력과 동시에 자동으로 갱신돼요.',
  },
  {
    icon: ClipboardEdit,
    title: '기록 일괄 관리',
    description: '화면에서 바로 입력하거나 엑셀로 한 번에 대량 등록할 수 있어요.',
  },
  {
    icon: Tv,
    title: 'TV 전광판 모드',
    description: '체육관 모니터에 띄워두면 종목이 자동으로 전환되며 순위를 보여줘요.',
  },
  {
    icon: Share2,
    title: '학부모 공개 링크',
    description: '로그인 없이도 학부모가 우리 아이 순위와 기록을 바로 확인할 수 있어요.',
  },
  {
    icon: TrendingUp,
    title: '성장 그래프',
    description: '학생별 월별 성장 추이를 그래프로 보여줘서 동기부여가 돼요.',
  },
  {
    icon: Award,
    title: '기록 인증 상장',
    description: '최고 기록을 A4 상장으로 바로 인쇄하거나 학부모에게 공유할 수 있어요.',
  },
];

const PLANS = [
  { name: 'FREE', price: '0원', limit: '학생 50명', highlight: false },
  { name: 'BASIC', price: '월 4,900원', limit: '학생 150명', highlight: true },
  { name: 'PRO', price: '월 9,900원', limit: '학생 500명', highlight: false, comingSoon: true },
];

export default function LandingPage() {
  useEffect(() => {
    document.title = '로프랭크 | 줄넘기 체육관 실시간 랭킹보드';
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const el = document.createElement('meta');
      el.setAttribute('name', 'description');
      document.head.appendChild(el);
      return el;
    })();
    meta.setAttribute(
      'content',
      '줄넘기 체육관을 위한 실시간 랭킹보드 서비스. 기록 관리, TV 전광판, 학부모 공개 링크까지 한 번에.'
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-900 font-sans antialiased">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 shrink-0 bg-[#1B5E20] rounded-xl flex items-center justify-center font-bold text-white text-base">
              로
            </div>
            <span className="font-bold text-base text-slate-900">로프랭크</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold transition-all"
            >
              로그인
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white text-sm font-bold transition-all"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 lg:px-8">
        {/* Hero */}
        <section className="text-center py-16 sm:py-24">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            줄넘기 체육관을 위한
            <br />
            실시간 랭킹보드
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed mb-8 max-w-lg mx-auto">
            기록 입력부터 랭킹, TV 전광판, 학부모 공개까지 — 줄넘기 체육관 운영에 필요한 걸 한 곳에서.
          </p>
          <Link
            to="/signup"
            className="inline-block px-8 py-3.5 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-sm shadow-sm transition-all"
          >
            무료로 시작하기
          </Link>
        </section>

        {/* Features */}
        <section className="py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing summary */}
        <section className="py-8 sm:py-12">
          <h2 className="text-xl font-bold text-slate-900 text-center mb-8">요금제</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 text-center ${
                  plan.highlight
                    ? 'bg-[#E8F5E9]/50 border-2 border-[#1B5E20] shadow-md'
                    : 'bg-white border border-slate-200/90'
                }`}
              >
                <h3 className="text-sm font-bold text-slate-900 mb-1">{plan.name}</h3>
                <div className="text-xl font-bold text-slate-900 mb-1">{plan.price}</div>
                <p className="text-xs text-slate-500 font-medium mb-3">{plan.limit}</p>
                {plan.comingSoon && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                    추후 오픈 예정
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 font-medium mt-6 flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#1B5E20]" />
            무료 플랜은 신용카드 등록 없이 바로 시작할 수 있어요
          </p>
        </section>

        <footer className="py-10 text-center text-xs text-slate-400 font-medium border-t border-slate-200/80">
          로프랭크 · 줄넘기 실시간 랭킹보드
        </footer>
      </main>
    </div>
  );
}
