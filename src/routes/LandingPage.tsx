import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  FileSpreadsheet,
  PenLine,
  Camera,
  Brain,
  ListChecks,
  Award,
  LineChart as LineChartIcon,
  Medal,
  Tv,
  Timer,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Podium } from '../components/Podium';
import { Leaderboard } from '../components/Leaderboard';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { CertificateModal } from '../components/CertificateModal';
import { getLeaderboardData } from '../lib/scoring';
import { DEFAULT_EVENTS } from '../data/constants';
import { Student, JumpRecord, GradeCategoryFilter } from '../types';

// Sample data for the interactive demo below the fold -- lets a visitor
// click into the real Podium / Leaderboard / StudentProfileModal /
// CertificateModal components instead of looking at static screenshots.
const DEMO_EVENT_KEY = '10s_alternate';

const DEMO_STUDENTS: Student[] = [
  { id: 'd1', studentNo: '24-01', name: '김민준', grade: '초등 3학년', gender: 'M', avatarColor: 'from-orange-500 to-amber-500', joinDate: '2026-03-02' },
  { id: 'd2', studentNo: '24-02', name: '이서연', grade: '초등 4학년', gender: 'F', avatarColor: 'from-blue-500 to-cyan-500', joinDate: '2026-02-14' },
  { id: 'd3', studentNo: '24-03', name: '박도윤', grade: '초등 2학년', gender: 'M', avatarColor: 'from-emerald-500 to-teal-500', joinDate: '2026-04-01' },
  { id: 'd4', studentNo: '24-04', name: '최지우', grade: '초등 5학년', gender: 'F', avatarColor: 'from-purple-500 to-pink-500', joinDate: '2026-01-20' },
  { id: 'd5', studentNo: '24-05', name: '정하은', grade: '초등 3학년', gender: 'F', avatarColor: 'from-rose-500 to-red-500', joinDate: '2026-05-11' },
];

const DEMO_MONTHLY_COUNTS: Record<string, number[]> = {
  d1: [24, 27, 31],
  d2: [22, 25, 29],
  d3: [18, 21, 24],
  d4: [26, 30, 34],
  d5: [16, 19, 23],
};
const DEMO_DATES = ['2026-06-15', '2026-07-15', '2026-08-10'];

// Records exist for every event, not just DEMO_EVENT_KEY, so opening a
// student's profile modal shows a growth graph no matter which event tab
// it defaults to.
const DEMO_RECORDS: JumpRecord[] = DEMO_STUDENTS.flatMap((s) =>
  Object.keys(DEFAULT_EVENTS).flatMap((eventKey) =>
    DEMO_MONTHLY_COUNTS[s.id].map((count, i) => ({
      id: `${s.id}-${eventKey}-${i}`,
      studentId: s.id,
      studentName: s.name,
      eventKey,
      count,
      date: DEMO_DATES[i],
    }))
  )
);

const PARENT_GROWTH_DATA = [
  { month: '6월', count: 82 },
  { month: '7월', count: 91 },
  { month: '8월', count: 103 },
];

const PAIN_POINTS = [
  { icon: FileSpreadsheet, label: '엑셀' },
  { icon: PenLine, label: '수기 기록' },
  { icon: Camera, label: '사진으로 기록' },
  { icon: Brain, label: '기억에 의존한 기록' },
];

const SOLUTIONS = [
  { icon: ListChecks, title: '기록 관리', desc: '학생별 종목·측정일·최고기록 관리' },
  { icon: Award, title: 'PB 관리', desc: '개인 최고기록 자동 관리' },
  { icon: LineChartIcon, title: '성장 데이터', desc: '학생별 기록 변화와 성장 그래프' },
  { icon: Medal, title: '랭킹', desc: '종목별·학년별·체육관별 랭킹' },
  { icon: Tv, title: 'TV 전광판', desc: '체육관 TV에 실시간 랭킹 표시' },
  { icon: Timer, title: '스피드 타이머', desc: '측정과 기록을 하나의 서비스에서', comingSoon: true },
];

const STUDENT_HOOKS = [
  { emoji: '🏆', label: 'PB 갱신' },
  { emoji: '📈', label: '성장 그래프' },
  { emoji: '🥇', label: '랭킹 경쟁' },
  { emoji: '🔥', label: '기록 도전' },
];

const OWNER_FEATURES = ['학생 관리', '기록 관리', '랭킹 관리', '성장 관리', 'TV 전광판', '기록 인증'];

const FREE_FEATURES = ['학생 등록', '기본 기록 관리', '랭킹보드', '기본 PB 관리'];
const PRO_FEATURES = [
  '학생 무제한',
  '기록 무제한',
  '성장 그래프',
  'PB 관리',
  '전체 랭킹',
  'TV 전광판',
  '스피드 타이머 (출시 예정)',
  '엑셀 일괄 등록',
  '기록 인증',
];

export default function LandingPage() {
  const [gradeFilter, setGradeFilter] = useState<GradeCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [certificateStudent, setCertificateStudent] = useState<Student | null>(null);

  const leaderboardItems = useMemo(
    () => getLeaderboardData(DEMO_STUDENTS, DEMO_RECORDS, DEMO_EVENT_KEY, gradeFilter, searchQuery, DEFAULT_EVENTS),
    [gradeFilter, searchQuery]
  );
  const topThree = leaderboardItems.slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#1B5E20] selection:text-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1B5E20] flex items-center justify-center">
              <Trophy className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-black text-lg tracking-tight">ROPERANK</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-block px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900"
            >
              로그인
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white text-sm font-bold shadow-sm"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* 01. Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E8F5E9] text-[#1B5E20] text-xs font-bold mb-6">
          <Trophy className="w-3.5 h-3.5" />
          줄넘기 기록 플랫폼
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-5">
          기록하고, 성장하고, <span className="text-[#1B5E20]">경쟁하다.</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 font-medium max-w-xl mx-auto mb-8">
          아이의 줄넘기 성장을 데이터로 보여주는
          <br className="hidden sm:block" />
          줄넘기 기록 플랫폼, ROPERANK
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-sm shadow-md flex items-center justify-center gap-1.5"
          >
            무료로 시작하기 <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#demo"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
          >
            서비스 둘러보기
          </a>
        </div>

        {/* Live demo of the real ranking board */}
        <div id="demo" className="mt-16 scroll-mt-20">
          <div className="bg-[#f4f5f8] border border-slate-200 rounded-3xl shadow-xl p-3 sm:p-6 text-left">
            <div className="flex items-center gap-1.5 mb-4 px-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs font-bold text-slate-400">
                roperank.com/g/우리체육관 — 실제 화면, 직접 눌러보세요
              </span>
            </div>
            <Podium
              topThree={topThree}
              activeTab={DEMO_EVENT_KEY}
              onSelectStudent={(id) => setSelectedStudent(DEMO_STUDENTS.find((s) => s.id === id) ?? null)}
            />
            <Leaderboard
              items={leaderboardItems}
              events={DEFAULT_EVENTS}
              activeTab={DEMO_EVENT_KEY}
              gradeFilter={gradeFilter}
              setGradeFilter={setGradeFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectStudent={(id) => setSelectedStudent(DEMO_STUDENTS.find((s) => s.id === id) ?? null)}
            />
          </div>
        </div>
      </section>

      {/* 02. Pain points */}
      <section className="bg-[#f4f5f8] py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            아직도 학생들의 기록을 이렇게 관리하고 계신가요?
          </h2>
          <p className="text-slate-500 font-medium mb-10">
            "우리 아이가 얼마나 늘었는지 어떻게 보여주고 계신가요?"
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-10">
            {PAIN_POINTS.map(({ icon: Icon, label }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-3">
                <Icon className="w-7 h-7 text-slate-400" />
                <span className="text-sm font-bold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900">
            "기록은 쌓이는데, 성장이 보이지 않습니다."
          </p>
        </div>
      </section>

      {/* 03. Solutions */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black mb-3">ROPERANK가 해결합니다</h2>
            <p className="text-slate-500 font-medium">
              기록 관리 → 성장 데이터 → 랭킹 → 동기부여 → 학부모 신뢰
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOLUTIONS.map(({ icon: Icon, title, desc, comingSoon }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-2xl p-6 relative">
                {comingSoon && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    추후 개발예정
                  </span>
                )}
                <div className="w-11 h-11 rounded-xl bg-[#E8F5E9] flex items-center justify-center mb-4">
                  <Icon className="w-5.5 h-5.5 text-[#1B5E20]" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
                <p className="text-sm text-slate-500 font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 04. For students */}
      <section className="bg-[#f4f5f8] py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">"내 기록을 깨고 싶다!"</h2>
          <p className="text-slate-500 font-medium mb-10">
            단순히 운동하는 것을 넘어, 게임처럼 기록을 깨는 경험
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {STUDENT_HOOKS.map(({ emoji, label }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-2">
                <span className="text-3xl">{emoji}</span>
                <span className="text-sm font-bold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 05. For parents */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-3">
              "우리 아이가 얼마나 성장했는지 보여주세요."
            </h2>
            <p className="text-slate-500 font-medium">
              "아이가 학원에서 뭘 배우고 있지?" — 데이터로 답할 수 있습니다.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">10초 번갈아뛰기 · 월별 최고기록</span>
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                3개월간 +25.6% 성장
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PARENT_GROWTH_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v}회`, '최고기록']} />
                  <Line type="monotone" dataKey="count" stroke="#1B5E20" strokeWidth={3} dot={{ r: 5, fill: '#1B5E20' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-sm font-bold text-slate-500">
              <span>6월 82회</span>
              <ArrowRight className="w-4 h-4" />
              <span>7월 91회</span>
              <ArrowRight className="w-4 h-4" />
              <span className="text-[#1B5E20]">8월 103회</span>
            </div>
          </div>
        </div>
      </section>

      {/* 06. For owners */}
      <section className="bg-[#f4f5f8] py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">줄넘기 교육을 데이터로 관리하세요.</h2>
          <p className="text-slate-500 font-medium mb-10">하나의 플랫폼에서</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {OWNER_FEATURES.map((label) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#1B5E20] shrink-0" />
                <span className="text-sm font-bold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 07. Pricing */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-12">가격</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border border-slate-200 rounded-3xl p-7">
              <h3 className="font-black text-lg mb-1">FREE</h3>
              <p className="text-3xl font-black mb-1">
                무료
              </p>
              <p className="text-xs font-bold text-slate-400 mb-6">최대 50명</p>
              <ul className="space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-2 border-[#1B5E20] rounded-3xl p-7 relative bg-[#E8F5E9]/40">
              <span className="absolute -top-3 left-7 text-[10px] font-black px-2.5 py-1 rounded-full bg-[#1B5E20] text-white">
                추천
              </span>
              <h3 className="font-black text-lg mb-1">PRO</h3>
              <p className="text-3xl font-black mb-1">
                월 4,900원
              </p>
              <p className="text-xs font-bold text-slate-400 mb-6">학생 무제한</p>
              <ul className="space-y-2.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-[#1B5E20] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 08. Final CTA */}
      <section className="bg-[#1B5E20] py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
            우리 체육관도
            <br />
            기록이 쌓이는 체육관으로 만들어보세요.
          </h2>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 mt-6 px-8 py-4 rounded-2xl bg-white text-[#1B5E20] font-black text-sm shadow-lg hover:bg-white/90"
          >
            무료로 ROPERANK 시작하기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="py-8 text-center text-xs font-medium text-slate-400 flex items-center justify-center gap-3">
        <span>© {new Date().getFullYear()} ROPERANK</span>
        <Link to="/login" className="hover:text-slate-600">관리자 로그인</Link>
      </footer>

      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          records={DEMO_RECORDS}
          events={DEFAULT_EVENTS}
          onOpenCertificate={(s) => {
            setSelectedStudent(null);
            setCertificateStudent(s);
          }}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {certificateStudent && (
        <CertificateModal
          gymName="우리 체육관"
          student={certificateStudent}
          records={DEMO_RECORDS}
          events={DEFAULT_EVENTS}
          onClose={() => setCertificateStudent(null)}
        />
      )}
    </div>
  );
}
