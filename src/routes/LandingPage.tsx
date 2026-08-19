import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardEdit,
  Trophy,
  TrendingUp,
  Tv,
  Award,
  Check,
  X,
  ArrowRight,
  ArrowDown,
  Plus,
  Minus,
  Crown,
} from 'lucide-react';
import logoMark from '../assets/logo-mark.webp';
import logoFull from '../assets/logo-full.webp';
import ropeStickers from '../assets/rope-stickers.webp';
import shotPodium from '../assets/showcase/shot-podium.webp';
import shotLeaderboard from '../assets/showcase/shot-leaderboard.webp';
import shotTv from '../assets/showcase/shot-tv.webp';
import shotEntry from '../assets/showcase/shot-entry.webp';
import shotProfileStats from '../assets/showcase/shot-profile-stats.webp';
import shotProfileGrowth from '../assets/showcase/shot-profile-growth.webp';

const PROBLEMS = [
  { title: '스티커가 떨어지고', body: '땀이나 물에 약해 스티커가 번지거나 떨어집니다.' },
  { title: '시간이 많이 걸리고', body: '한 수업 시간에 많은 학생의 기록을 붙이고 확인하느라 시간이 많이 소요됩니다.' },
  { title: '최고기록만 남고', body: '현재 최고기록은 확인 가능하지만 과거 기록과 성장 과정은 알기 어렵습니다.' },
  { title: '기록이 쌓일수록', body: '관리해야 할 일이 늘어나고, 정확한 기록 관리가 어려워집니다.' },
];

const FEATURES = [
  { icon: ClipboardEdit, title: '학생 기록 관리', body: '학생별 줄넘기 기록을 간편하게 저장하고 관리하세요.' },
  { icon: Trophy, title: '자동 랭킹', body: '기록을 입력하면 순위가 자동으로 정리됩니다.' },
  { icon: TrendingUp, title: '성장 데이터', body: '과거 기록과 비교해 아이의 성장을 한눈에 확인하세요.' },
  { icon: Tv, title: 'TV 랭킹보드', body: '체육관 TV에 랭킹을 띄워 아이들의 도전 욕구를 만들어보세요.' },
  { icon: Award, title: '기록 갱신', body: '기록을 깨는 순간이 다음 도전의 목표가 됩니다.' },
];

const OBJECTIONS = [
  {
    q: '"우리 체육관은 학생이 50명도 안 되는데요."',
    a: '그래서 준비했습니다. 학생 50명까지 무료로 사용할 수 있습니다. 직접 사용해보고 우리 체육관에 필요한 서비스인지 판단해보세요.',
  },
  {
    q: '"사용하기 어렵지 않나요?"',
    a: '복잡한 프로그램이 아닙니다. 학생 등록 → 기록 입력 → 랭킹 확인, 기본적인 사용 흐름은 간단합니다.',
  },
  {
    q: '"아이들이 정말 좋아할까요?"',
    a: 'ROPERANK는 단순히 기록을 저장하는 서비스가 아닙니다. 자신의 기록을 확인하고 친구와 비교하고 새로운 기록에 도전할 수 있도록 만드는 서비스입니다.',
  },
  {
    q: '"월 4,900원이 꼭 필요한가요?"',
    a: '꼭 필요한 체육관만 사용하시면 됩니다. 처음부터 결제할 필요 없이 50명까지 무료로 사용해보세요. 필요성을 느꼈을 때 BASIC으로 전환하시면 됩니다.',
  },
];

const TIERS = [
  {
    key: 'free',
    name: 'FREE',
    price: '0원',
    limit: '학생 최대 50명',
    features: ['랭킹보드', '기록관리 (최근 3개월)', '성장그래프', '공개 링크', 'TV 전광판'],
    highlight: false,
  },
  {
    key: 'basic',
    name: 'BASIC',
    price: '월 4,900원',
    limit: '학생 최대 150명',
    features: ['추가 종목 등록', '기록관리 (전체 이력)', '엑셀 대량 등록', '기록 인증 상장 발급', '광고 없음'],
    highlight: true,
  },
  {
    key: 'pro',
    name: 'PRO',
    price: '월 9,900원',
    limit: '학생 최대 500명',
    features: ['체육관 계정 2개', '체육관 로고 사용', '고급 통계 (업데이트 예정)'],
    highlight: false,
    comingSoon: true,
  },
];

const FAQS = [
  {
    q: 'ROPERANK는 어떤 서비스인가요?',
    a: '줄넘기 체육관의 학생 기록을 관리하고 랭킹과 성장 데이터를 확인할 수 있는 줄넘기 전용 기록 플랫폼입니다.',
  },
  {
    q: '무료로 사용할 수 있나요?',
    a: '네. 학생 50명까지 무료로 사용할 수 있습니다.',
  },
  {
    q: '50명이 넘으면 어떻게 되나요?',
    a: 'BASIC 요금제로 업그레이드하면 학생을 150명까지, PRO는 500명까지 등록할 수 있습니다.',
  },
  {
    q: '모바일에서도 사용할 수 있나요?',
    a: '네. 모바일 환경에서도 사용할 수 있도록 설계되어 있습니다.',
  },
  {
    q: 'TV에서도 볼 수 있나요?',
    a: '네. 체육관 TV에 랭킹보드를 표시할 수 있도록 지원합니다. 별도 설치 없이 브라우저에서 바로 켤 수 있어요.',
  },
  {
    q: '엑셀을 사용하고 있는데 바꿔야 하나요?',
    a: '꼭 바꿔야 하는 것은 아닙니다. 기존 방식보다 기록 관리와 랭킹 관리가 편해지는지 무료로 직접 사용해보신 후 결정하시면 됩니다.',
  },
  {
    q: '언제든 해지할 수 있나요?',
    a: '네. 별도의 장기 약정 없이 이용할 수 있도록 운영합니다.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200/80 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
      >
        <span className="text-sm font-bold text-slate-900">{q}</span>
        {open ? (
          <Minus className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <Plus className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>
      {open && <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2.5 pr-8">{a}</p>}
    </div>
  );
}

function scrollToId(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <img src={logoMark} alt="" className="h-7 w-auto" />
      <span className={`font-bold text-lg tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        ROPE<span className="text-[#2E9E4F]">RANK</span>
      </span>
    </span>
  );
}

export default function LandingPage() {
  useEffect(() => {
    document.title = 'ROPERANK | 줄넘기 기록 & 랭킹 플랫폼';
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const el = document.createElement('meta');
      el.setAttribute('name', 'description');
      document.head.appendChild(el);
      return el;
    })();
    meta.setAttribute(
      'content',
      '아이의 줄넘기 성장을 데이터로 보여주는 줄넘기 기록 & 랭킹 플랫폼, ROPERANK. 학생 50명까지 무료.'
    );
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <BrandMark />
          </Link>
          <nav className="hidden sm:flex flex-1 items-center justify-center gap-10 text-base font-bold text-slate-600">
            <a href="#product" onClick={scrollToId('product')} className="hover:text-slate-900 transition-colors">기능</a>
            <a href="#pricing" onClick={scrollToId('pricing')} className="hover:text-slate-900 transition-colors">요금제</a>
            <a href="#faq" onClick={scrollToId('faq')} className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>
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

      <main>
        {/* 01. HERO */}
        <section className="max-w-5xl mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-10 items-center py-16 sm:py-24">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold tracking-wider mb-5">
              JUMP ROPE RECORD &amp; RANKING PLATFORM
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
              기록하고, 성장하고,
              <br />
              <span className="text-[#1B5E20]">경쟁하다.</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed mb-2">
              아이의 줄넘기 성장을 데이터로 보여주는
              <br className="hidden sm:block" />
              줄넘기 기록 &amp; 랭킹 플랫폼, <strong className="text-slate-900">ROPERANK</strong>
            </p>
            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed mb-8">
              기록은 자동으로 쌓이고, 성장은 데이터로 보이며,
              <br />
              아이들은 다음 기록에 도전합니다.
            </p>
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-sm shadow-sm transition-all"
              >
                무료로 시작하기
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#product"
                onClick={scrollToId('product')}
                className="inline-flex items-center px-6 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all"
              >
                서비스 둘러보기
              </a>
            </div>
            <p className="text-[11px] text-slate-400 font-bold">
              학생 50명까지 무료 · 카드 등록 없이 시작 · 언제든 업그레이드 가능
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <img
              src={shotPodium}
              alt="ROPERANK 실시간 랭킹보드 화면 — 학생별 순위와 기록이 자동으로 정리된다"
              className="w-full max-w-md rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60"
            />
          </div>
        </section>

        {/* 02. PROBLEM -- sticker management */}
        <section className="bg-slate-50 border-y border-slate-200/70">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20">
            <div className="grid lg:grid-cols-2 gap-10">
              <div className="relative w-full max-w-sm mx-auto lg:max-w-none aspect-[4/5] lg:aspect-auto rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden">
                <img
                  src={ropeStickers}
                  alt="줄넘기 손잡이에 최고기록을 하나씩 붙여둔 스티커"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-3">
                    관장님, 최고기록을 아직
                    <br />
                    줄넘기에 <span className="text-[#1B5E20]">스티커</span>로 관리하고 계신가요?
                  </h2>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    아이들의 최고기록을 줄넘기에 스티커로 붙여두면 수업 중에도 아이의 기록을
                    한눈에 확인할 수 있습니다.
                    <br />
                    하지만 기록하는 학생이 많아질수록 조금씩 불편한 점이 생기기 시작합니다.
                  </p>
                </div>

                <div className="space-y-3 mb-8">
                  {PROBLEMS.map((p) => (
                    <div key={p.title} className="flex items-start gap-3 bg-white border border-slate-200/90 rounded-2xl p-4">
                      <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-0.5">{p.title}</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{p.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8">
                  <h3 className="text-base font-bold mb-3">스티커가 나쁜 것은 아닙니다.</h3>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed mb-4">
                    문제는 기록이 쌓이면서{' '}
                    <strong className="text-white">
                      '최고기록 하나'만으로는 아이의 성장을 모두 보여주기 어렵다는 것
                    </strong>
                    입니다.
                  </p>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed mb-5">
                    ROPERANK는 기존의 기록 방식을 없애는 것이 아니라, 아이들의 모든 기록을
                    데이터로 남겨 최고기록은 물론, 과거 기록과 성장 과정까지 한눈에 보여줍니다.
                  </p>
                  <p className="text-sm font-bold text-[#A5D6A7] border-t border-white/10 pt-4 leading-relaxed">
                    최고기록 하나를 남기는 것에서, 아이의 성장 전체를 기록하는 것으로.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 03. OBJECTION -- excel */}
        <section className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-4">
              "엑셀로 하면 되는 거 아닌가요?"
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              맞습니다. 학생 수가 적고 기록 관리가 단순하다면 엑셀로도 충분할 수 있습니다.
              <br />
              ROPERANK는 엑셀을 무조건 대체하려고 만든 서비스가 아닙니다.
              <br />
              학생이 많아지고, 기록이 쌓이고, 순위와 성장 데이터를 계속 관리해야 할 때 발생하는
              <br className="hidden sm:block" />
              관장님의 시간을 줄이기 위해 만들어졌습니다.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-xl mx-auto mb-10">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center">
              <p className="text-[11px] font-bold text-slate-400 tracking-wider mb-4">기존</p>
              <div className="space-y-2 text-xs font-bold text-slate-500">
                {['기록', '엑셀 입력', '정렬', '순위 확인', '기록 비교', '화면 제작'].map((step, i, arr) => (
                  <React.Fragment key={step}>
                    <div className="bg-white border border-slate-200 rounded-lg py-2">{step}</div>
                    {i < arr.length - 1 && <ArrowDown className="w-3 h-3 text-slate-300 mx-auto" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="bg-[#E8F5E9]/50 border-2 border-[#1B5E20] rounded-2xl p-5 text-center">
              <p className="text-[11px] font-bold text-[#1B5E20] tracking-wider mb-4">ROPERANK</p>
              <div className="space-y-2 text-xs font-bold text-slate-700">
                {['기록 입력', '자동 정리', '끝'].map((step, i, arr) => (
                  <React.Fragment key={step}>
                    <div className="bg-white border border-[#A5D6A7] rounded-lg py-2">{step}</div>
                    {i < arr.length - 1 && <ArrowDown className="w-3 h-3 text-[#66BB6A] mx-auto" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-sm font-bold text-slate-900 max-w-md mx-auto">
            기록 관리가 목적이 아니라, 아이들에게 더 집중할 수 있는 시간을 만드는 것.
          </p>
        </section>

        {/* 04. SOLUTION */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20">
            <div className="text-center max-w-lg mx-auto mb-10">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
                그래서 만들었습니다.
                <br />
                줄넘기 기록을 위한 플랫폼, ROPERANK
              </h2>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                ROPERANK는 아이들의 줄넘기 기록을 체계적으로 관리하고, 랭킹과 성장 데이터를 통해
                동기를 만들어주는 줄넘기 전용 기록 플랫폼입니다.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {[
                { title: '기록', body: '아이들의 기록을 한곳에서 관리합니다.' },
                { title: '성장', body: '과거 기록과 비교해 얼마나 성장했는지 확인합니다.' },
                { title: '경쟁', body: '랭킹을 통해 다음 기록에 도전하게 만듭니다.' },
              ].map((v) => (
                <div key={v.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <h3 className="text-base font-bold text-[#A5D6A7] mb-2">{v.title}</h3>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{v.body}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-sm font-bold tracking-wide text-white/70">
              기록 → 데이터 → 성장 → 도전
            </p>
          </div>
        </section>

        {/* 05. PRODUCT -- real product screenshots */}
        <section id="product" className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20 scroll-mt-16">
          <div className="text-center max-w-lg mx-auto mb-14">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-3">
              복잡한 기록 관리는 줄이고, 필요한 데이터만 한눈에.
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              실제 ROPERANK 화면입니다. 만든 이미지가 아니라, 지금 체육관에서 쓰는 그대로예요.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start mb-16">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] text-[#1B5E20] text-[11px] font-bold mb-4">
                <Trophy className="w-3.5 h-3.5" />
                실시간 랭킹보드
              </span>
              <h3 className="text-xl font-bold text-slate-900 mb-3">기록을 입력하면, 순위는 자동으로.</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                종목별·종합 랭킹이 기록 입력과 동시에 자동으로 갱신돼요. 학년별 필터와 검색으로
                원하는 학생을 바로 찾을 수 있어요.
              </p>
            </div>
            <img
              src={shotLeaderboard}
              alt="ROPERANK 랭킹보드 화면 — TOP 3 시상대와 종목별 순위 리스트"
              className="w-full rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start mb-16">
            <div className="space-y-4 order-2 lg:order-1">
              <img
                src={shotProfileStats}
                alt="ROPERANK 학생 기록 카드 — 종목별 최고 기록 현황"
                className="w-full rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60"
              />
              <img
                src={shotProfileGrowth}
                alt="ROPERANK 성장 그래프 — 월별 기록 변화와 성장률"
                className="w-full rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60"
              />
            </div>
            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] text-[#1B5E20] text-[11px] font-bold mb-4">
                <TrendingUp className="w-3.5 h-3.5" />
                학생 기록 &amp; 성장
              </span>
              <h3 className="text-xl font-bold text-slate-900 mb-3">과거 기록과 비교해, 성장을 확인하세요.</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                종목별 최고기록이 카드로 정리되고, 측정할 때마다 성장 그래프가 자동으로 업데이트돼요.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] text-[#1B5E20] text-[11px] font-bold mb-4">
                <ClipboardEdit className="w-3.5 h-3.5" />
                기록 입력
              </span>
              <h3 className="text-xl font-bold text-slate-900 mb-3">종목 고르고, 개수만 입력하세요.</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                기존 최고기록이 함께 보여서 비교가 쉽고, 오늘 기록이 이전보다 낮아도 최고기록과
                랭킹은 안전하게 보존돼요. 엑셀 대량 등록도 지원해요.
              </p>
            </div>
            <img
              src={shotEntry}
              alt="ROPERANK 기록 일괄 입력 화면 — 종목 선택, 측정일자, 학생별 기존 최고기록"
              className="w-full rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60"
            />
          </div>
        </section>

        {/* TV showcase, dark full-bleed */}
        <section className="bg-slate-900">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold mb-5">
              <Tv className="w-3.5 h-3.5" />
              TV 랭킹보드
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3">
              체육관 TV에 랭킹을 띄워, 아이들의 도전 욕구를 만들어보세요.
            </h2>
            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8 max-w-md mx-auto">
              별도 프로그램 설치 없이 브라우저에서 바로 전체화면으로 켤 수 있고, 종목별 순위가
              자동으로 전환되며 보여져요.
            </p>
            <img
              src={shotTv}
              alt="ROPERANK TV 랭킹 전광판 화면 — 종목별 순위가 자동으로 전환되며 표시된다"
              className="w-full rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </section>

        {/* 06. FEATURES */}
        <section id="features" className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20 scroll-mt-16">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-3">
              줄넘기 체육관에 필요한 기능만 담았습니다.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 07. CHILD */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight mb-4">
                아이들은 기록을 관리하지 않습니다.
                <br />
                <span className="text-[#A5D6A7]">기록을 깨고 싶어 합니다.</span>
              </h2>
              <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6">
                "내가 몇 등이지?" "친구는 몇 개 하지?" "다음에는 몇 개까지 할 수 있을까?"
                <br />
                기록이 보이면 아이들은 자연스럽게 다음 목표를 만들기 시작합니다.
              </p>
              <a
                href="#pricing"
                onClick={scrollToId('pricing')}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#A5D6A7] hover:text-white transition-colors"
              >
                내 기록에 도전하기
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="w-64 rounded-3xl bg-white/5 border border-white/10 p-5">
                <p className="text-[10px] font-bold text-white/40 tracking-wider mb-1">MY RECORD</p>
                <p className="text-sm font-bold mb-3">김민준</p>
                <p className="text-4xl font-bold mb-1">
                  158<span className="text-base font-bold text-white/50 ml-1">회</span>
                </p>
                <p className="text-xs font-bold text-[#A5D6A7] flex items-center gap-1 mb-4">
                  <Crown className="w-3.5 h-3.5" />
                  체육관 1위
                </p>
                <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                  <span className="text-[11px] text-white/40 font-bold">지난 기록 143회</span>
                  <span className="text-xs font-bold text-[#A5D6A7]">+15회</span>
                </div>
                <p className="text-[11px] font-bold text-amber-400 mt-2">NEW RECORD</p>
              </div>
            </div>
          </div>
        </section>

        {/* 08. GROWTH */}
        <section className="bg-slate-50 border-y border-slate-200/70">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-4">
              "우리 아이, 얼마나 늘었을까?"
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-lg mx-auto mb-8">
              학부모님에게 중요한 것은 단순히 오늘 몇 개를 했는지가 아닙니다.
              <br />
              지난달보다 얼마나 성장했는지입니다.
            </p>
            <p className="text-base font-bold text-slate-900 max-w-md mx-auto">
              잘하고 있다는 말보다, 숫자로 보여주는 성장이 더 오래 기억됩니다.
            </p>
          </div>
        </section>

        {/* 09. GYM OWNER */}
        <section className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-3">
              관장님은 기록 관리보다 아이들에게 집중하세요.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-xl mx-auto mb-10">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center">
              <p className="text-[11px] font-bold text-slate-400 tracking-wider mb-4">BEFORE</p>
              <div className="space-y-2 text-xs font-bold text-slate-500">
                {['기록 측정', '메모', '엑셀 입력', '순위 계산', '과거 기록 검색', 'TV 화면 제작'].map(
                  (step, i, arr) => (
                    <React.Fragment key={step}>
                      <div className="bg-white border border-slate-200 rounded-lg py-2">{step}</div>
                      {i < arr.length - 1 && <ArrowDown className="w-3 h-3 text-slate-300 mx-auto" />}
                    </React.Fragment>
                  )
                )}
              </div>
            </div>
            <div className="bg-[#E8F5E9]/50 border-2 border-[#1B5E20] rounded-2xl p-5 text-center">
              <p className="text-[11px] font-bold text-[#1B5E20] tracking-wider mb-4">AFTER</p>
              <div className="space-y-2 text-xs font-bold text-slate-700">
                {['기록 입력', 'ROPERANK가 정리', '랭킹 · 성장 데이터 · 기록 확인'].map((step, i, arr) => (
                  <React.Fragment key={step}>
                    <div className="bg-white border border-[#A5D6A7] rounded-lg py-2">{step}</div>
                    {i < arr.length - 1 && <ArrowDown className="w-3 h-3 text-[#66BB6A] mx-auto" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-sm font-bold text-slate-900 max-w-md mx-auto">
            관장님의 시간을 줄이고, 아이들과 함께하는 시간을 늘립니다.
          </p>
        </section>

        {/* 10. OBJECTION 2 */}
        <section className="bg-slate-50 border-y border-slate-200/70">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-center mb-10">
              그래도 이런 생각이 드실 수 있습니다.
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {OBJECTIONS.map((o) => (
                <div key={o.q} className="bg-white border border-slate-200/90 rounded-2xl p-5">
                  <p className="text-sm font-bold text-slate-900 mb-2">{o.q}</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{o.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 11. FREE TRIAL */}
        <section className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20">
          <div className="rounded-3xl bg-[#1B5E20] text-white p-10 sm:p-14 text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
              일단, 무료로 사용해보세요.
            </h2>
            <p className="text-sm text-white/80 font-medium leading-relaxed mb-8 max-w-md mx-auto">
              학생 50명까지 무료. 직접 사용해보고 ROPERANK의 가치를 경험해보세요.
            </p>
            <div className="flex items-center justify-center gap-8 sm:gap-14 mb-9">
              {[
                { n: '50명', l: '무료 학생 등록' },
                { n: '0원', l: '무료로 시작' },
                { n: '1분', l: '간단한 가입' },
              ].map((s) => (
                <div key={s.n}>
                  <p className="text-2xl sm:text-3xl font-bold">{s.n}</p>
                  <p className="text-[11px] font-bold text-white/70 mt-1">{s.l}</p>
                </div>
              ))}
            </div>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-2xl bg-white hover:bg-white/90 text-[#1B5E20] font-bold text-sm shadow-sm transition-all"
            >
              무료로 시작하기
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-[11px] text-white/60 font-bold mt-4">카드 등록 없이 시작할 수 있습니다.</p>
          </div>
        </section>

        {/* 12. PRICING */}
        <section id="pricing" className="max-w-5xl mx-auto px-4 lg:px-8 py-16 sm:py-20 scroll-mt-16">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-3">
              간단하고 투명하게.
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              학생 50명까지는 계속 무료로 사용할 수 있습니다.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto items-stretch">
            {TIERS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 flex flex-col ${
                  plan.highlight
                    ? 'bg-[#E8F5E9]/50 border-2 border-[#1B5E20] shadow-md'
                    : 'bg-white border border-slate-200/90'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                  {plan.highlight && (
                    <span className="px-2 py-0.5 rounded-full bg-[#1B5E20] text-white text-[10px] font-bold">
                      추천
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold text-slate-900 mb-1">{plan.price}</div>
                <p className="text-xs text-slate-500 font-medium mb-4">{plan.limit}</p>
                <ul className="space-y-2 mb-5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <Check className="w-3.5 h-3.5 text-[#1B5E20] shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.comingSoon && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold self-start">
                    추후 오픈 예정
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 14. FAQ */}
        <section id="faq" className="bg-slate-50 border-y border-slate-200/70 scroll-mt-16">
          <div className="max-w-2xl mx-auto px-4 lg:px-8 py-16 sm:py-20">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-center mb-8">
              FAQ
            </h2>
            <div>
              {FAQS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* 15. FINAL CTA */}
        <section className="max-w-5xl mx-auto px-4 lg:px-8 py-20 sm:py-28 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-5">
            기록이 보이면,
            <br />
            <span className="text-[#1B5E20]">성장이 보입니다.</span>
          </h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10 max-w-md mx-auto">
            아이의 줄넘기 기록을 관리하고 성장과 도전을 데이터로 만들어보세요.
          </p>
          <img src={logoFull} alt="ROPERANK — 기록하고, 성장하고, 경쟁하다." className="h-24 w-auto mx-auto mb-10" />
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-sm shadow-sm transition-all"
          >
            무료로 시작하기
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-[11px] text-slate-400 font-bold mt-4">카드 등록 없이 시작할 수 있습니다.</p>
        </section>

        <footer className="border-t border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <BrandMark />
            </Link>
            <div className="flex items-center gap-5 text-xs text-slate-400 font-medium">
              <a href="#product" onClick={scrollToId('product')} className="hover:text-slate-600 transition-colors">기능</a>
              <a href="#pricing" onClick={scrollToId('pricing')} className="hover:text-slate-600 transition-colors">요금제</a>
              <Link to="/login" className="hover:text-slate-600 transition-colors">로그인</Link>
              <Link to="/signup" className="hover:text-slate-600 transition-colors">회원가입</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
