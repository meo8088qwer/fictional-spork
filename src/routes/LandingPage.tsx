import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Tv,
  ClipboardEdit,
  Share2,
  TrendingUp,
  Award,
  Check,
  ArrowRight,
  Plus,
  Minus,
  FileSpreadsheet,
  MonitorPlay,
} from 'lucide-react';

const MOCK_ROWS = [
  { rank: 1, name: '김서연', count: 214 },
  { rank: 2, name: '이도윤', count: 198 },
  { rank: 3, name: '박하은', count: 187 },
];

const SHOWCASE_CARDS = [
  {
    icon: ClipboardEdit,
    title: '화면에서 바로 입력',
    description: '학생을 고르고 개수만 입력하면 끝. 최고기록은 자동으로 계산돼요.',
  },
  {
    icon: FileSpreadsheet,
    title: '엑셀로 한 번에 등록',
    description: '수업이 끝난 뒤 엑셀 파일 하나로 반 전체 기록을 대량 등록할 수 있어요.',
  },
  {
    icon: TrendingUp,
    title: '개인 최고기록 자동 갱신',
    description: '새 기록이 이전 최고기록을 넘으면 자동으로 표시해 줘요.',
  },
];

const GRID_FEATURES = [
  {
    icon: Trophy,
    title: '실시간 랭킹보드',
    description: '종목별·종합 랭킹이 기록 입력과 동시에 자동으로 갱신돼요.',
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

const STEPS = [
  { step: '01', title: '무료로 가입', description: '카드 등록 없이 이메일만으로 30초면 시작할 수 있어요.' },
  { step: '02', title: '학생·종목 등록', description: '학생 명단을 올리고, 우리 체육관에서 쓰는 종목을 설정해요.' },
  { step: '03', title: '공개 링크 공유', description: '학부모에게 링크 하나만 보내면 로그인 없이 순위를 확인할 수 있어요.' },
];

const TIERS = [
  {
    key: 'free',
    name: 'FREE',
    price: '0원',
    limit: '학생 50명',
    features: ['랭킹보드', '기록관리 (최근 3개월)', '성장그래프', '공개 링크', 'TV 전광판'],
    highlight: false,
  },
  {
    key: 'basic',
    name: 'BASIC',
    price: '월 4,900원',
    limit: '학생 150명',
    features: ['추가 종목 등록', '기록관리 (전체 이력)', '엑셀 대량 등록', '기록 인증 상장 발급', '광고 없음'],
    highlight: true,
  },
  {
    key: 'pro',
    name: 'PRO',
    price: '월 9,900원',
    limit: '학생 500명',
    features: ['체육관 계정 2개', '체육관 로고 사용', '고급 통계 (업데이트 예정)'],
    highlight: false,
    comingSoon: true,
  },
];

const FAQS = [
  {
    q: '결제 없이 바로 써볼 수 있나요?',
    a: '네. FREE 플랜은 카드 등록 없이 이메일만으로 바로 시작할 수 있고, 학생 50명까지 무료로 이용할 수 있어요.',
  },
  {
    q: '학부모는 어떻게 순위를 확인하나요?',
    a: '체육관마다 발급되는 공개 링크(roperank.com/g/체육관주소)를 학부모에게 공유하면, 로그인 없이 바로 우리 아이 순위와 기록을 확인할 수 있어요.',
  },
  {
    q: 'TV 전광판은 어떤 화면인가요?',
    a: '체육관 모니터나 TV에 띄워두면 종목별 순위가 자동으로 전환되며 보여지는 전체화면 모드예요. 별도 프로그램 설치 없이 브라우저에서 바로 켤 수 있어요.',
  },
  {
    q: '기존에 쓰던 기록을 옮길 수 있나요?',
    a: '엑셀 대량 등록 기능으로 기존 기록을 한 번에 옮길 수 있어요. 파일 형식이 다르면 마이페이지의 문의로 알려주시면 도와드려요.',
  },
  {
    q: '플랜은 언제든 변경할 수 있나요?',
    a: '네. 마이페이지의 요금제 메뉴에서 언제든 플랜을 확인하고 변경 문의를 남길 수 있어요.',
  },
];

function LeaderboardMock() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 p-5 w-full max-w-sm">
      <div className="flex items-center gap-1.5 mb-4">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
      </div>
      <p className="text-[11px] font-bold text-slate-400 mb-3">2단 옆뛰기 · 종합 랭킹</p>
      <div className="space-y-2">
        {MOCK_ROWS.map((row) => (
          <div
            key={row.rank}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                  row.rank === 1
                    ? 'bg-[#1B5E20] text-white'
                    : 'bg-[#E8F5E9] text-[#1B5E20]'
                }`}
              >
                {row.rank}
              </span>
              <span className="text-xs font-bold text-slate-800">{row.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-500">{row.count}개</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
          <nav className="hidden sm:flex items-center gap-6 text-xs font-bold text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">기능</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">요금제</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
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

      <main className="max-w-5xl mx-auto px-4 lg:px-8">
        {/* Hero */}
        <section className="grid lg:grid-cols-2 gap-10 items-center py-16 sm:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] text-[#1B5E20] text-[11px] font-bold mb-5">
              줄넘기 체육관을 위한 랭킹 서비스
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
              줄넘기 기록을,
              <br />
              <span className="italic text-[#1B5E20]">가장 쉽게</span> 보여주는 방법
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed mb-8 max-w-md">
              기록 입력부터 랭킹, TV 전광판, 학부모 공개까지 — 줄넘기 체육관 운영에 필요한 걸 한 곳에서.
            </p>
            <div className="flex items-center gap-2.5">
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-sm shadow-sm transition-all"
              >
                무료로 시작하기
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center px-6 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all"
              >
                기능 둘러보기
              </a>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <LeaderboardMock />
          </div>
        </section>

        {/* Dark showcase: TV mode */}
        <section className="py-4 sm:py-6">
          <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 grid lg:grid-cols-2 gap-8 items-center overflow-hidden">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold mb-5">
                <MonitorPlay className="w-3.5 h-3.5" />
                TV 전광판 모드
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight mb-4">
                체육관 모니터에 띄워두기만 하면
                <br />
                <span className="italic text-[#A5D6A7]">알아서 순위가 돌아가요</span>
              </h2>
              <p className="text-sm text-slate-300 font-medium leading-relaxed max-w-md">
                별도 프로그램 설치 없이 브라우저에서 바로 전체화면으로 켤 수 있고, 종목별 순위가
                자동으로 전환되면서 보여져요.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-white/50">종합 랭킹</span>
                <Tv className="w-4 h-4 text-white/40" />
              </div>
              <div className="space-y-2">
                {MOCK_ROWS.map((row) => (
                  <div
                    key={row.rank}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                          row.rank === 1 ? 'bg-[#66BB6A] text-slate-900' : 'bg-white/10 text-white'
                        }`}
                      >
                        {row.rank}
                      </span>
                      <span className="text-xs font-bold text-white">{row.name}</span>
                    </div>
                    <span className="text-xs font-bold text-white/60">{row.count}개</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Feature showcase: record entry */}
        <section id="features" className="py-16 sm:py-20 scroll-mt-20">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-3">
              1분이면 <span className="italic text-[#1B5E20]">기록 입력</span> 끝
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              화면에서 바로 입력하거나, 엑셀로 반 전체를 한 번에 등록할 수 있어요.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SHOWCASE_CARDS.map((f) => (
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

        {/* Split section: public link */}
        <section className="py-8 sm:py-12">
          <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 grid lg:grid-cols-2 gap-8 items-center">
            <div className="order-2 lg:order-1 flex justify-center">
              <div className="rounded-[2rem] border-[6px] border-slate-900 w-56 overflow-hidden shadow-lg">
                <div className="bg-slate-900 h-4 flex items-center justify-center">
                  <span className="w-10 h-1 rounded-full bg-white/30" />
                </div>
                <div className="bg-white p-3">
                  <p className="text-[10px] font-bold text-slate-400 mb-2">우리 체육관 랭킹</p>
                  <div className="space-y-1.5">
                    {MOCK_ROWS.map((row) => (
                      <div
                        key={row.rank}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50"
                      >
                        <span className="text-[10px] font-bold text-slate-700">
                          {row.rank}. {row.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{row.count}개</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] text-[#1B5E20] text-[11px] font-bold mb-5">
                <Share2 className="w-3.5 h-3.5" />
                학부모 공개 링크
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
                로그인 없이도
                <br />
                <span className="italic text-[#1B5E20]">바로 확인</span>할 수 있어요
              </h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md">
                체육관마다 발급되는 링크 하나만 공유하면, 학부모가 앱 설치나 회원가입 없이도
                우리 아이 순위와 기록을 바로 볼 수 있어요.
              </p>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {GRID_FEATURES.map((f) => (
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

        {/* How it works */}
        <section className="py-16 sm:py-20">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-3">
              시작하는 방법
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              가입부터 학부모 공유까지, 3단계면 충분해요.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center sm:text-left">
                <span className="text-2xl font-bold text-[#A5D6A7]">{s.step}</span>
                <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">{s.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 sm:py-20 scroll-mt-20">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-3">
              무료로 시작해서, <span className="italic text-[#1B5E20]">필요한 만큼</span> 키워요
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              카드 등록 없이 바로 시작할 수 있어요.
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
          <p className="text-center text-xs text-slate-400 font-medium mt-6 flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#1B5E20]" />
            무료 플랜은 신용카드 등록 없이 바로 시작할 수 있어요
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16 sm:py-20 scroll-mt-20 max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-center mb-8">
            자주 묻는 질문
          </h2>
          <div>
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section className="py-8 sm:py-12">
          <div className="rounded-3xl bg-[#1B5E20] text-white p-10 sm:p-14 text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
              지금 바로 무료로 시작해보세요
            </h2>
            <p className="text-sm text-white/80 font-medium mb-7 max-w-md mx-auto">
              카드 등록 없이 이메일만으로 30초면 우리 체육관 랭킹보드를 만들 수 있어요.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-2xl bg-white hover:bg-white/90 text-[#1B5E20] font-bold text-sm shadow-sm transition-all"
            >
              무료로 시작하기
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <footer className="py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium border-t border-slate-200/80">
          <span>로프랭크 · 줄넘기 실시간 랭킹보드</span>
          <div className="flex items-center gap-5">
            <a href="#features" className="hover:text-slate-600 transition-colors">기능</a>
            <a href="#pricing" className="hover:text-slate-600 transition-colors">요금제</a>
            <Link to="/login" className="hover:text-slate-600 transition-colors">로그인</Link>
            <Link to="/signup" className="hover:text-slate-600 transition-colors">회원가입</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
