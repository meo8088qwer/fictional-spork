import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Trophy,
  ClipboardEdit,
  ListChecks,
  Users,
  Tv,
  Globe,
  Share2,
  Sparkles,
  UserCog,
  Save,
  RotateCcw,
  FileSpreadsheet,
  Check,
  Info,
  Radio,
  LayoutDashboard,
  Image as ImageIcon,
  CreditCard,
  Pencil,
  Hash,
} from 'lucide-react';
import { Student, JumpRecord, DisplayTab, GradeCategoryFilter, TimeFilter } from '../types';
import { DEFAULT_EVENTS } from '../data/constants';
import { getLeaderboardData } from '../lib/scoring';
import { EventSelector } from './EventSelector';
import { Podium } from './Podium';
import { Leaderboard } from './Leaderboard';

// Small self-contained sample dataset, used only to power the live
// mini-previews below -- never touches real gym data.
const SAMPLE_EVENTS = DEFAULT_EVENTS;
const SAMPLE_STUDENTS: Student[] = [
  { id: 'g1', studentNo: '2026-001', name: '김민준', grade: '초등 3학년', gender: 'M', avatarColor: 'from-orange-500 to-amber-500', joinDate: '2026-01-01', classLabel: '1부' },
  { id: 'g2', studentNo: '2026-002', name: '이서연', grade: '초등 4학년', gender: 'F', avatarColor: 'from-blue-500 to-cyan-500', joinDate: '2026-01-01', classLabel: '1부' },
  { id: 'g3', studentNo: '2026-003', name: '박도윤', grade: '초등 2학년', gender: 'M', avatarColor: 'from-emerald-500 to-teal-500', joinDate: '2026-01-01', classLabel: '2부' },
  { id: 'g4', studentNo: '2026-004', name: '최지우', grade: '유치부 7세', gender: 'F', avatarColor: 'from-purple-500 to-pink-500', joinDate: '2026-01-01', classLabel: '2부' },
];
const SAMPLE_RECORDS: JumpRecord[] = [
  { id: 'gr1', studentId: 'g1', studentName: '김민준', eventKey: '30s_basic', count: 132, date: '2026-08-20' },
  { id: 'gr2', studentId: 'g2', studentName: '이서연', eventKey: '30s_basic', count: 121, date: '2026-08-20' },
  { id: 'gr3', studentId: 'g3', studentName: '박도윤', eventKey: '30s_basic', count: 98, date: '2026-08-20' },
  { id: 'gr4', studentId: 'g4', studentName: '최지우', eventKey: '30s_basic', count: 76, date: '2026-08-20' },
];

const TOC_ITEMS: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'leaderboard', label: '랭킹보드', icon: Trophy },
  { id: 'record-entry', label: '기록 입력', icon: ClipboardEdit },
  { id: 'excel-bulk', label: '엑셀로 등록', icon: FileSpreadsheet },
  { id: 'live-count', label: '실시간 측정', icon: Radio },
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'event-manage', label: '종목 관리', icon: ListChecks },
  { id: 'student-manage', label: '수련생 관리', icon: Users },
  { id: 'tv-mode', label: 'TV 전광판', icon: Tv },
  { id: 'global-ranking', label: '전체랭킹', icon: Globe },
  { id: 'public-link', label: '공개 링크', icon: Share2 },
  { id: 'pricing', label: '요금제', icon: Sparkles },
  { id: 'mypage', label: '마이페이지', icon: UserCog },
];

const GuideSection: React.FC<{
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tag?: string;
  intro: string;
  children: React.ReactNode;
}> = ({ id, icon: Icon, title, tag, intro, children }) => (
  <section id={id} className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-5 sm:p-7 scroll-mt-4">
    <div className="flex items-center gap-3 mb-2">
      <span className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {tag && (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">{tag}</span>
      )}
    </div>
    <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4">{intro}</p>
    <div className="space-y-4">{children}</div>
  </section>
);

// Lightweight "browser chrome" frame around the static mockups below, so
// they read as UI previews rather than plain text/icon lists.
const PreviewFrame: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="rounded-xl border border-slate-200 overflow-hidden">
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border-b border-slate-200">
      <span className="w-2 h-2 rounded-full bg-slate-300" />
      <span className="w-2 h-2 rounded-full bg-slate-300" />
      <span className="w-2 h-2 rounded-full bg-slate-300" />
      <span className="ml-2 text-[10px] font-bold text-slate-400">{label}</span>
    </div>
    <div className="bg-slate-50/60 p-3.5">{children}</div>
  </div>
);

// Numbered walkthrough -- "화면 어디를 눌러야 하는지"를 순서대로 알려주는
// 용도. Bullets(아래)는 참고 팁이고, Steps는 실제로 따라 하는 절차라 구분함.
const Steps: React.FC<{ items: string[] }> = ({ items }) => (
  <ol className="space-y-3">
    {items.map((line, i) => (
      <li key={i} className="flex items-start gap-3 text-sm text-slate-700 font-medium leading-relaxed">
        <span className="shrink-0 w-6 h-6 rounded-full bg-[#1B5E20] text-white text-xs font-bold flex items-center justify-center mt-0.5">
          {i + 1}
        </span>
        <span>{line}</span>
      </li>
    ))}
  </ol>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[11px] font-bold text-slate-400 tracking-wide">{children}</h3>
);

const Bullets: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="space-y-2">
    {items.map((line) => (
      <li key={line} className="flex items-start gap-2 text-sm text-slate-600 font-medium leading-relaxed">
        <Check className="w-4 h-4 text-[#1B5E20] shrink-0 mt-0.5" />
        <span>{line}</span>
      </li>
    ))}
  </ul>
);

export const UserGuidePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section');

  // A "❓ 사용법" button on the 기록관리/실시간측정/종목관리/수련생관리
  // screens links here with ?section=<id> instead of duplicating this
  // page's content inline on each of those screens.
  useEffect(() => {
    if (!section) return;
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [section]);

  // Local playground state for the live 랭킹보드 mini-demo -- independent
  // of the real app's state, resets whenever this page is left.
  const [demoTab, setDemoTab] = useState<DisplayTab>('30s_basic');
  const [demoTimeFilter, setDemoTimeFilter] = useState<TimeFilter>('ALL');
  const [demoGradeFilter, setDemoGradeFilter] = useState<GradeCategoryFilter>('ALL');
  const [demoClassFilter, setDemoClassFilter] = useState<string>('ALL');
  const [demoSearch, setDemoSearch] = useState<string>('');

  const demoItems = getLeaderboardData(
    SAMPLE_STUDENTS,
    SAMPLE_RECORDS,
    demoTab,
    demoGradeFilter,
    demoSearch,
    SAMPLE_EVENTS,
    demoClassFilter
  );

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="max-w-4xl">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#1B5E20]" />
          <h1 className="text-2xl font-bold text-slate-900">사용가이드</h1>
        </div>
        <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">
          로프랭크를 처음 쓰시는 분도, 컴퓨터가 익숙하지 않으신 분도 이 페이지만 보고 그대로 따라 하시면 돼요.
          궁금한 항목을 아래에서 눌러 바로 이동하거나, 위에서부터 천천히 읽어 내려가셔도 좋아요. 화면 캡처처럼
          보이는 회색 박스는 실제 화면을 그대로 흉내 낸 미리보기이고, "랭킹보드" 항목은 진짜 화면과 똑같이
          직접 눌러보실 수 있어요.
        </p>
      </div>

      {/* 목차 -- 페이지가 길어서, 필요한 항목으로 바로 이동할 수 있게 */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 mb-5">
        <p className="text-[11px] font-bold text-slate-400 mb-2.5">궁금한 항목을 눌러보세요</p>
        <div className="flex flex-wrap gap-2">
          {TOC_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-[#E8F5E9] border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#1B5E20] cursor-pointer transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <GuideSection
          id="leaderboard"
          icon={Trophy}
          title="랭킹보드"
          intro='로그인하면 가장 먼저 보이는 첫 화면이에요. 왼쪽 사이드바 메뉴의 "랭킹보드"를 눌러도 언제든 여기로 돌아올 수 있어요. 우리 체육관 학생들의 순위를 종목별로 볼 수 있는 화면이에요.'
        >
          <SectionLabel>따라해보세요</SectionLabel>
          <Steps
            items={[
              '화면 위쪽에 "30초 양발모아뛰기", "30초 번갈아뛰기"처럼 종목 이름이 적힌 탭들이 나란히 있어요. 원하는 종목을 누르면 그 종목 순위로 바뀌어요.',
              '"종합 랭킹" 탭을 누르면 모든 종목 점수를 합친 전체 순위를 볼 수 있어요.',
              '순위표 위쪽 검색창에 학생 이름을 입력하면 그 학생만 바로 찾을 수 있어요.',
              '검색창 옆의 "학년" 버튼을 누르면 특정 학년만, "반" 버튼(반을 지정한 학생이 있을 때만 보여요)을 누르면 특정 반만 골라서 볼 수 있어요.',
              '학생 이름을 누르면 그 학생의 전체 기록과 성장 그래프가 담긴 상세 화면이 열려요.',
            ]}
          />
          <SectionLabel>실제 화면 그대로 눌러보세요 (가짜 샘플 데이터예요)</SectionLabel>
          <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60 space-y-3">
            <EventSelector
              events={SAMPLE_EVENTS}
              activeTab={demoTab}
              setActiveTab={setDemoTab}
              timeFilter={demoTimeFilter}
              setTimeFilter={setDemoTimeFilter}
            />
            <Podium topThree={demoItems.slice(0, 3)} activeTab={demoTab} onSelectStudent={() => {}} />
            <Leaderboard
              items={demoItems}
              events={SAMPLE_EVENTS}
              activeTab={demoTab}
              gradeFilter={demoGradeFilter}
              setGradeFilter={setDemoGradeFilter}
              classFilter={demoClassFilter}
              setClassFilter={setDemoClassFilter}
              classOptions={['1부', '2부']}
              searchQuery={demoSearch}
              setSearchQuery={setDemoSearch}
              onSelectStudent={() => {}}
            />
          </div>
          <SectionLabel>더 알아두면 좋아요</SectionLabel>
          <Bullets
            items={[
              '"반" 필터는 수련생 관리에서 학생 한 명에게라도 반을 지정해야 나타나요. 반을 아직 안 정하셨다면 안 보이는 게 정상이에요.',
              '학생 상세 화면의 "스토리 공유" 버튼을 누르면 그 학생의 최고기록을 인스타 스토리(9:16 세로) 이미지로 바로 다운로드할 수 있어요. 학부모님이 보는 공개 링크에서도 로그인 없이 똑같이 쓸 수 있어요.',
              '순위는 새 기록이 저장되는 즉시 자동으로 다시 계산돼요. 따로 새로고침하거나 "순위 계산" 버튼을 누를 필요가 없어요.',
            ]}
          />
        </GuideSection>

        <GuideSection
          id="record-entry"
          icon={ClipboardEdit}
          title="기록관리 -- 기록 직접 입력"
          intro='학생들이 오늘 줄넘기를 몇 개 넘었는지 입력하는 화면이에요. 왼쪽 사이드바 메뉴에서 "기록 관리"를 클릭하면 열려요. 수업 끝나고 그날 측정한 개수를 여기다 적으시면 돼요.'
        >
          <SectionLabel>따라해보세요</SectionLabel>
          <Steps
            items={[
              '왼쪽 사이드바에서 "기록 관리"를 클릭하세요.',
              '화면 위쪽 종목 선택은 기본값이 "전체"예요. 이 상태면 30초 양발모아뛰기, 30초 번갈아뛰기 등 모든 종목 칸이 한 화면에 나란히 보여서, 한 학생의 여러 종목을 한 번에 입력할 수 있어요. 종목 하나만 골라서 그 종목에만 집중해서 입력하고 싶으면 드롭다운에서 원하는 종목을 선택하세요.',
              '학생 이름 줄에서 오늘 측정한 종목의 칸을 찾아 숫자(줄넘기 넘은 개수)를 입력하세요. 키보드 숫자로 그냥 입력하면 돼요.',
              '한 학생을 다 입력했으면 Enter 키를 눌러보세요. 같은 종목의 다음 학생 칸으로 자동으로 이동해서 빠르게 입력할 수 있어요.',
              '모든 학생을 다 입력했으면 화면 아래쪽의 초록색 "일괄 기록 저장하기" 버튼을 누르세요.',
              '"이 종목으로 저장할까요?" 하고 한 번 더 확인하는 창이 떠요. 맞으면 "확인"을 누르세요 -- 실수로 다른 종목에 잘못 저장되는 걸 막기 위한 절차예요.',
              '저장이 끝나면 화면 위쪽에 "기록이 성공적으로 저장되었습니다!"라는 초록색 메시지가 뜨고, 방금 입력한 기록들이 목록으로 나와요.',
            ]}
          />
          <SectionLabel>화면 미리보기</SectionLabel>
          <PreviewFrame label="기록 관리 > 직접 입력">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              {['30초 양발', '30초 번갈아', '30초 이중', '10초 양발', '10초 번갈아', '10초 이중'].map((t) => (
                <span key={t} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-500">
                  {t}
                </span>
              ))}
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">김민준 · 초등 3학년</span>
              <div className="flex items-center gap-1.5">
                {[132, 45, 38, 40, 20, 18].map((v, i) => (
                  <span key={i} className="w-9 h-6 rounded bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center justify-center">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </PreviewFrame>
          <SectionLabel>더 알아두면 좋아요</SectionLabel>
          <Bullets
            items={[
              '저장 후에도 랭킹보드로 자동 이동하지 않고 이 화면에 그대로 남아있어요. 입력했던 숫자 칸만 비워지니, 이어서 다음 반 학생들을 바로 입력하시면 돼요.',
              '오늘 저장한 기록은 화면 위쪽에 목록으로 뜨는데, 잘못 입력해서 취소하고 싶으면 그 옆의 되돌리기 버튼을 누르면 바로 취소돼요.',
              '기존에 더 높은 기록이 있던 학생이 이번엔 더 낮은 개수를 입력해도 걱정 마세요. 기존 최고기록은 그대로 유지되고, 이번 기록은 측정 이력에만 남아요(최고기록이 깎이지 않아요).',
            ]}
          />
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>되돌리기</span>
            <span className="text-slate-300">·</span>
            <Save className="w-3.5 h-3.5" />
            <span>저장 확인 팝업</span>
          </div>
        </GuideSection>

        <GuideSection
          id="excel-bulk"
          icon={FileSpreadsheet}
          title="기록관리 -- 엑셀로 여러 명 한 번에 등록"
          tag="베이직 이상"
          intro="수련생이 많은 체육관을 위한 기능이에요. 한 명씩 화면에서 입력하는 대신, 엑셀 파일에 미리 적어서 한 번에 올리면 여러 학생의 기록이 한꺼번에 저장돼요."
        >
          <SectionLabel>따라해보세요</SectionLabel>
          <Steps
            items={[
              '왼쪽 사이드바 "기록 관리" 화면에서 아래로 내려가면 "엑셀로 여러 명 기록 한 번에 올리기" 부분이 있어요.',
              '"양식 다운로드" 버튼을 눌러 빈 엑셀 파일을 받으세요. 이 파일에는 학생 이름, 학년, 종목별 칸이 이미 만들어져 있어요.',
              '받은 엑셀 파일을 여시고, 학생 이름 옆 종목 칸에 오늘 측정한 개수를 입력한 뒤 저장하세요.',
              '화면으로 돌아와 "파일 선택" 버튼을 눌러 방금 저장한 엑셀 파일을 고르세요.',
              '올린 내용이 표로 미리 보이면, 잘못된 부분이 없는지 확인한 뒤 "업로드" 버튼을 누르세요.',
            ]}
          />
          <SectionLabel>화면 미리보기</SectionLabel>
          <PreviewFrame label="기록 관리 > 엑셀로 여러 명 기록 한 번에 올리기">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-200">
                  <th className="text-left py-1">수련생이름</th>
                  <th className="text-left py-1">학년</th>
                  <th className="text-right py-1">30초 양발</th>
                  <th className="text-right py-1">10초 이중</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 font-semibold">
                <tr className="border-b border-slate-100">
                  <td className="py-1">김민준</td>
                  <td>초등 3학년</td>
                  <td className="text-right">132</td>
                  <td className="text-right">18</td>
                </tr>
                <tr>
                  <td className="py-1">이서연</td>
                  <td>초등 4학년</td>
                  <td className="text-right">121</td>
                  <td className="text-right">15</td>
                </tr>
              </tbody>
            </table>
          </PreviewFrame>
          <SectionLabel>더 알아두면 좋아요</SectionLabel>
          <Bullets
            items={[
              '기존 최고기록보다 낮은 기록을 올려도 최고기록은 안전하게 유지돼요(측정 이력에는 남아요).',
              '엑셀에 아직 등록되지 않은 새 이름을 적으면 수련생이 자동으로 새로 등록돼요. 따로 수련생 관리에서 먼저 등록하지 않아도 돼요.',
              '체육관만의 커스텀 종목을 추가했다면, 양식을 다시 다운로드하면 그 종목 칸도 함께 들어있어요.',
            ]}
          />
        </GuideSection>

        <GuideSection
          id="live-count"
          icon={Radio}
          title="실시간 측정"
          intro='코치님 여러 명이 각자 휴대폰이나 태블릿을 들고 동시에 기록을 입력하고 싶을 때 쓰는 기능이에요. 왼쪽 사이드바의 "실시간 측정"을 클릭하면 시작할 수 있어요.'
        >
          <SectionLabel>따라해보세요</SectionLabel>
          <Steps
            items={[
              '왼쪽 사이드바에서 "실시간 측정"을 클릭하세요.',
              '"반 선택"에서 오늘 측정할 반을 고르고, "종목 선택"에서 어떤 종목을 잴지 고르세요.',
              '출석 확인 목록이 나와요. 기본은 전원 출석으로 체크되어 있으니, 오늘 결석한 학생만 체크를 해제하세요.',
              '"실시간 측정 시작" 버튼을 누르면 접속 링크가 하나 생겨요.',
              '그 링크를 복사해서, 함께 측정하는 다른 코치님의 휴대폰(같은 계정으로 로그인된 상태)에 보내주세요. 그 기기에서 링크를 열면 나와 똑같은 화면이 뜨고, 누가 입력하든 모든 기기에 실시간으로 바로 반영돼요.',
              '각 학생 옆 칸에 숫자를 입력하면서 측정을 진행하세요.',
              '다 끝나면 아래쪽 "전체 저장" 버튼을 눌러야 진짜 기록으로 저장돼요. 누르기 전까지는 화면들끼리만 숫자를 공유하는 중이라, 저장 전에는 언제든 안전하게 고칠 수 있어요.',
            ]}
          />
          <SectionLabel>더 알아두면 좋아요</SectionLabel>
          <Bullets
            items={[
              '요금제 제한 없이 FREE 플랜을 포함한 모든 플랜에서 쓸 수 있어요.',
              '결석 체크는 오늘 이 측정에만 적용돼요. 수련생 명단 자체가 바뀌는 건 아니라서, 다음에 다시 실시간 측정을 시작하면 전원 출석 상태로 다시 시작해요.',
              '화면 맨 위 "라운드 음원 재생" 카드에서 10초/30초 종목용 신호음을 바로 재생할 수 있어요. 종목 선택과는 상관없이 언제든 원하는 라운드 음원을 눌러 재생하시면 됩니다.',
              '"실시간 측정" 대신 "계수기 측정"으로 시작하면, 숫자를 직접 타이핑하는 대신 화면의 +1 버튼을 눌러서 세는 방식으로 바뀌어요. 이중뛰기 오래하기처럼 천천히 세는 종목에 더 편해요.',
            ]}
          />
        </GuideSection>

        <GuideSection
          id="dashboard"
          icon={LayoutDashboard}
          title="대시보드"
          intro='체육관 전체 현황을 한눈에 보는 화면이에요. 왼쪽 사이드바에서 "대시보드"를 클릭하면 열려요. 이번 달에 몇 명이 새로 등록했는지, 신기록이 얼마나 나왔는지 등을 요약해서 보여줘요.'
        >
          <SectionLabel>여기서 볼 수 있는 것</SectionLabel>
          <Bullets
            items={[
              '맨 위 4개 숫자: 전체 수련생 수 · 이번 달 신규 등록 · 이번 달 측정 건수 · 이번 달 신기록 갱신 건수.',
              '그 아래 반별 카드: 각 반의 인원수, 이번 달 신기록을 세운 학생 비율(막대그래프), 평균 종합점수, 그 반 1등 학생을 보여줘요.',
              '반별 카드는 신기록 갱신 비율이 높은 반부터 순서대로 나열돼요.',
              '아직 반을 지정하지 않은 학생들은 "미배정" 카드로 따로 모여서 보여요.',
            ]}
          />
          <SectionLabel>더 알아두면 좋아요</SectionLabel>
          <Bullets
            items={[
              '반별 카드가 하나도 안 보인다면, 아직 학생들에게 반을 지정하지 않으셨기 때문이에요. "수련생 관리"에서 반을 먼저 지정해 주세요.',
            ]}
          />
        </GuideSection>

        <GuideSection
          id="event-manage"
          icon={ListChecks}
          title="종목 관리"
          intro='"30초 양발모아뛰기"처럼 기본으로 제공되는 6개 종목 외에, 우리 체육관만의 특별한 종목(예: "2중 3단계 30초")을 새로 만들 수 있는 화면이에요. 왼쪽 사이드바 "종목 관리"를 클릭하면 열려요.'
        >
          <SectionLabel>새 종목 만들어보기</SectionLabel>
          <Steps
            items={[
              '왼쪽 사이드바에서 "종목 관리"를 클릭하세요.',
              '화면 위쪽 "새 종목 추가" 버튼을 누르세요.',
              '종목 이름(예: 3단 뛰기)과 측정 시간(예: 30초)을 입력하세요.',
              '"저장" 버튼을 누르면 새 종목이 목록에 추가돼요. 이제 기록관리 드롭다운, 엑셀 양식, 랭킹보드 탭에 이 종목이 바로 나타나요.',
            ]}
          />
          <SectionLabel>더 알아두면 좋아요</SectionLabel>
          <Bullets
            items={[
              'FREE(무료) 플랜은 기본 6종목만 쓸 수 있어요. BASIC 플랜은 커스텀 종목을 3개까지 더 만들 수 있고(총 9종목), PRO 플랜은 개수 제한이 없어요.',
              '각 종목 카드에 적힌 "표준 기준: 우수 N회 / 프로 M회" 부분을 누르면, 그 숫자를 우리 체육관 학생들 수준에 맞게 직접 바꿀 수 있어요. 기본값은 전체 평균으로 만든 참고용 숫자라, 체육관마다 학생 수준이 다르면 이 기준도 다르게 맞추는 게 좋아요.',
              '기본 종목(양발모아뛰기 등)은 실수로 지워도 걱정 마세요. "기본 종목 초기화" 버튼을 누르면 원래대로 되돌릴 수 있어요.',
            ]}
          />
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
            <Pencil className="w-3.5 h-3.5" />
            <span>표준 기준 직접 수정 가능</span>
          </div>
        </GuideSection>

        <GuideSection
          id="student-manage"
          icon={Users}
          title="수련생 관리"
          intro='체육관에 다니는 학생들을 등록하고 관리하는 화면이에요. 왼쪽 사이드바 "수련생 관리"를 클릭하면 열려요. 한 명씩 등록할 수도 있고, 엑셀로 여러 명을 한 번에 등록할 수도 있어요.'
        >
          <SectionLabel>학생 한 명 등록하기</SectionLabel>
          <Steps
            items={[
              '왼쪽 사이드바에서 "수련생 관리"를 클릭하세요.',
              '화면 위쪽 "+ 수련생 추가" 버튼을 누르세요.',
              '이름, 학년, 성별 같은 기본 정보를 입력하세요.',
              '"저장" 버튼을 누르면 등록이 끝나요. 이제 기록관리, 랭킹보드 등 모든 화면에서 이 학생을 바로 볼 수 있어요.',
            ]}
          />
          <SectionLabel>반(수업시간) 지정하기</SectionLabel>
          <Steps
            items={[
              '학생 카드에 있는 "반 지정" 배지(작은 버튼)를 누르세요.',
              '원하는 반 이름을 직접 입력하세요. 예를 들어 "월수 1부"처럼 자유롭게 이름 지으시면 돼요.',
              '요일마다 다른 반에 오는 학생이라면, 콤마(,)로 구분해서 여러 반을 함께 적으세요. 예: "월1부, 화2부".',
              '입력하고 나면 그 자리에서 바로 저장돼요. 반을 지정하면 랭킹보드/기록관리/대시보드에 반 필터가 자동으로 나타나요.',
            ]}
          />
          <SectionLabel>화면 미리보기</SectionLabel>
          <PreviewFrame label="수련생 관리">
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_STUDENTS.slice(0, 2).map((s) => (
                <div key={s.id} className="bg-white rounded-lg border border-slate-200 p-2 flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${s.avatarColor} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                    {s.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-800 truncate">{s.name}</div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">
                      {s.classLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </PreviewFrame>
          <SectionLabel>더 알아두면 좋아요</SectionLabel>
          <Bullets
            items={[
              '이미 등록된 학생도, 명단 엑셀에 "반" 열만 채워서 다시 올리면 반 정보만 갱신돼요(이름/학년은 바뀌지 않아요).',
              '순위표 상단 "전체 반" 필터 옆에 "미배정"을 고르면, 아직 반이 없는 학생만 걸러서 볼 수 있어요.',
              '학생을 잘못 등록했거나 그만둔 경우, 학생 카드의 메뉴에서 삭제할 수 있어요. 다만 삭제하면 그 학생의 모든 기록도 함께 사라지니 신중하게 눌러주세요.',
            ]}
          />
        </GuideSection>

        <GuideSection
          id="tv-mode"
          icon={Tv}
          title="TV 전광판"
          intro='체육관 안 모니터나 TV에 계속 띄워두는 화면이에요. 왼쪽 사이드바 "TV 전광판"을 클릭하면 열리고, 전체 화면으로 크게 보여줄 수 있어요. 순위가 자동으로 넘어가면서 보여지기 때문에, 등수가 낮은 아이도 자기 이름이 나올 때까지 기다리며 볼 수 있어요(상위 몇 명만 보여주고 끝나지 않아요).'
        >
          <SectionLabel>세 가지 방식 중 골라보세요</SectionLabel>
          <Bullets
            items={[
              'Version 1 (자동 전환): 종목이 순서대로 바뀌면서, 한 종목 안에서도 1~10위, 11~20위 순서로 전체 인원을 끝까지 보여줘요. 그냥 틀어두기만 하면 되는 가장 간단한 방식이에요.',
              'Version 2 (고정 화면): "종합 순위", "종목별 한눈에 보기"(6종목 미니 순위를 동시에), "종목별 순위" 중 하나를 골라서 고정으로 볼 수 있어요. 이것도 전체 인원을 끝까지 페이지 넘기며 보여줘요.',
              'Version 3 (반별 보기): 반 하나를 고정으로 보거나, "전체 반 순차 표시"를 고르면 반이 자동으로 바뀌면서 그 반 학생들의 순위를 끝까지 보여줘요.',
            ]}
          />
          <SectionLabel>화면 미리보기</SectionLabel>
          <PreviewFrame label="TV 전광판">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#1B5E20] text-white">Version 1</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                Version 2
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                Version 3
              </span>
            </div>
            <div className="bg-white rounded-lg border-2 border-[#1B5E20] p-2 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-700">11~20위 표시 중</span>
              <span className="text-slate-900">3초~10초마다 자동 전환</span>
            </div>
          </PreviewFrame>
          <SectionLabel>더 알아두면 좋아요</SectionLabel>
          <Bullets
            items={[
              '화면이 넘어가는 속도(3초~10초)는 세 버전 모두 각자 따로 설정할 수 있어요. 화면 아래쪽 초록색 바가 다음 화면까지 남은 시간을 보여줘요.',
              '컴퓨터나 노트북 화면 크기에 자동으로 맞춰져서, 스크롤하지 않아도 한 화면에 다 보여요.',
            ]}
          />
        </GuideSection>

        <GuideSection
          id="global-ranking"
          icon={Globe}
          title="전체랭킹"
          intro='로그인 없이 누구나 볼 수 있는, 전국 모든 체육관 학생들이 함께 겨루는 순위예요. 왼쪽 사이드바 "전체랭킹"을 클릭하면 볼 수 있어요.'
        >
          <SectionLabel>알아두세요</SectionLabel>
          <Bullets
            items={[
              '전체랭킹을 "보는 것"은 모든 플랜(FREE 포함)에서 무료예요.',
              '우리 체육관 학생들의 기록이 이 전체랭킹에 "참가"해서 실제로 뜨려면 BASIC 이상 플랜이 필요해요.',
              '우리 체육관 기록을 전체랭킹에서 빼고 싶다면(참가하고 싶지 않다면), 마이페이지에서 언제든 끌 수 있어요.',
            ]}
          />
        </GuideSection>

        <GuideSection
          id="public-link"
          icon={Share2}
          title="공개 링크"
          intro='로그인 없이 학부모님이 바로 우리 체육관 랭킹보드를 볼 수 있는 전용 링크예요.'
        >
          <SectionLabel>따라해보세요</SectionLabel>
          <Steps
            items={[
              '왼쪽 사이드바에서 "공개 링크"를 클릭하세요. 새 탭이 열리면서 학부모님이 보게 될 화면이 그대로 나와요.',
              '그 탭의 주소창에 있는 링크 주소를 복사하세요.',
              '카카오톡이나 문자로 학부모님께 그 링크를 그대로 보내주시면 돼요. 학부모님은 로그인 없이 바로 열어보실 수 있어요.',
            ]}
          />
        </GuideSection>

        <GuideSection
          id="pricing"
          icon={Sparkles}
          title="요금제"
          intro='체육관 규모와 필요에 따라 고를 수 있는 3가지 요금제예요. 왼쪽 사이드바 아래쪽 "요금제"를 클릭하면 자세히 볼 수 있어요.'
        >
          <Bullets
            items={[
              'FREE: 학생 50명까지, 기본 6종목만 이용 가능해요. 처음 시작할 때 부담 없이 써보기 좋아요.',
              'BASIC: 학생 150명까지, 커스텀 종목을 3개 더 만들 수 있고(총 9종목), 엑셀 대량 등록도 쓸 수 있어요. 전체랭킹 참가도 가능해요.',
              'PRO: 학생 수 제한이 없고, 커스텀 종목도 무제한이에요. 기록 인증 상장 발급, 체육관 로고 사용 같은 기능도 추가로 쓸 수 있어요.',
            ]}
          />
        </GuideSection>

        <GuideSection
          id="mypage"
          icon={UserCog}
          title="마이페이지"
          intro='체육관 이름, 공개 링크 주소, 비밀번호, 결제 정보, 체육관 로고를 관리하는 화면이에요. 왼쪽 사이드바 아래쪽 "마이페이지"를 클릭하면 열려요.'
        >
          <SectionLabel>여기서 할 수 있는 것</SectionLabel>
          <Bullets
            items={[
              '체육관 이름과 공개 링크 주소(예: roperank.com/g/우리체육관)를 원하는 대로 바꿀 수 있어요.',
              '로그인 비밀번호를 변경할 수 있어요.',
              '"구독 관리" 카드에서 결제 수단, 다음 결제일, 이전 결제 내역을 확인하고, 월간/연간 주기 변경이나 구독 해지를 할 수 있어요.',
              '"전체랭킹 참가" 카드에서 우리 체육관 기록을 전국 전체랭킹에 보여줄지 말지 스위치로 켜고 끌 수 있어요.',
              '체육관 로고를 업로드하면(PRO 플랜 전용) 사이드바, 공개 게시판, TV 전광판에서 기본 색상 아이콘 대신 우리 체육관 로고가 보여요.',
            ]}
          />
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
            <CreditCard className="w-3.5 h-3.5" />
            <span>구독 관리</span>
            <span className="text-slate-300">·</span>
            <ImageIcon className="w-3.5 h-3.5" />
            <span>체육관 로고 (프로)</span>
          </div>
        </GuideSection>
      </div>

      <div className="mt-6 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            여기 나온 설명만으로 잘 안 되거나, 더 궁금한 점이 있으시면 언제든 편하게 말씀해 주세요. 화면을
            그대로 캡처해서 보내주셔도 좋아요.
          </p>
          <p className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            궁금한 게 하나라도 있으면 물어보는 게 제일 빨라요 -- 부담 갖지 마세요.
          </p>
        </div>
      </div>
    </div>
  );
};
