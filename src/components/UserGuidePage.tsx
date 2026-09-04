import React, { useState } from 'react';
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

const GuideSection: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tag?: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, tag, children }) => (
  <section className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-5 sm:p-6">
    <div className="flex items-center gap-2.5 mb-3">
      <span className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </span>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {tag && (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">{tag}</span>
      )}
    </div>
    <div className="space-y-3">{children}</div>
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

const Bullets: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="space-y-1.5">
    {items.map((line) => (
      <li key={line} className="flex items-start gap-2 text-xs text-slate-600 font-medium leading-relaxed">
        <Check className="w-3.5 h-3.5 text-[#1B5E20] shrink-0 mt-0.5" />
        <span>{line}</span>
      </li>
    ))}
  </ul>
);

export const UserGuidePage: React.FC = () => {
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

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#1B5E20]" />
          <h1 className="text-xl font-bold text-slate-900">사용가이드</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium mt-1.5 leading-relaxed">
          기능별로 짧게 정리했어요. 랭킹보드 미리보기는 실제 화면 그대로(가짜 샘플 데이터로) 직접 눌러볼 수 있고,
          다른 기능들은 실제 화면과 같은 배치로 재현한 미리보기예요.
        </p>
      </div>

      <div className="space-y-5">
        <GuideSection icon={Trophy} title="랭킹보드">
          <p className="text-xs text-slate-500 font-medium">
            종목 탭을 눌러 종목별/종합 순위를 보고, 검색·학년 필터·반 필터로 원하는 학생만 좁혀서 볼 수 있어요.
            아래는 실제 화면과 동일한 컴포넌트에 샘플 데이터를 넣은 것 -- 직접 눌러보세요.
          </p>
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
          <Bullets
            items={[
              '학년 필터 아래 "반" 필터는 수련생 관리에서 반을 지정한 학생이 한 명이라도 있어야 나타나요.',
              '이름을 누르면 그 학생의 상세 기록/성장 그래프를 볼 수 있어요.',
              '상세 기록 화면의 "스토리 공유" 버튼을 누르면 최고기록을 인스타 스토리(9:16) 이미지로 바로 다운로드할 수 있어요. 학부모님이 보는 공개 링크에서도 로그인 없이 똑같이 쓸 수 있어요.',
            ]}
          />
        </GuideSection>

        <GuideSection icon={ClipboardEdit} title="기록관리 -- 기록 직접 입력">
          <p className="text-xs text-slate-500 font-medium">
            기본 6종목(30초 3개 + 10초 3개)을 한 화면에서 동시에 입력하고, 드롭다운에서 커스텀 종목을 고르면
            7번째 칸으로 추가돼요.
          </p>
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
          <Bullets
            items={[
              '화면 위 종목 선택은 기본이 "전체"라 모든 종목 칸이 한 번에 보이고, 하나만 골라 그 종목만 집중해서 입력할 수도 있어요.',
              '"일괄 기록 저장하기"를 누르면 어떤 종목으로 저장하는지 한 번 더 확인 팝업이 떠요(잘못 저장 방지).',
              '저장 후에도 랭킹보드로 이동하지 않고 이 페이지에 그대로 남아요 -- 입력칸만 비워집니다.',
              '오늘 저장한 기록은 화면 위쪽에 목록으로 뜨고, 되돌리기 버튼으로 바로 취소할 수 있어요.',
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

        <GuideSection icon={FileSpreadsheet} title="기록관리 -- 엑셀 대량 등록" tag="베이직+">
          <p className="text-xs text-slate-500 font-medium">
            수련생이 많은 체육관을 위한 기능이에요. 양식을 받아 여러 학생·여러 종목 기록을 한 번에 엑셀로 올릴 수
            있고, 커스텀 종목도 열에 포함돼요.
          </p>
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
          <Bullets
            items={[
              '기존 최고기록보다 낮은 기록을 올려도 최고기록은 안전하게 유지돼요(측정 이력에는 남음).',
              '엑셀에 없는 새 이름을 적으면 수련생이 자동으로 새로 등록돼요.',
            ]}
          />
        </GuideSection>

        <GuideSection icon={Radio} title="실시간 측정">
          <p className="text-xs text-slate-500 font-medium">
            여러 기기로 동시에 기록을 입력하는 기능이에요. 반과 종목을 고르고 출석 체크(기본은 전원 출석,
            결석한 아이만 체크 해제)를 한 뒤 측정을 시작하면 접속 링크가 생겨요. 그 링크를 다른 기기(코치
            휴대폰 등)에서 열면 같은 화면을 보면서 실시간으로 숫자를 입력할 수 있고, 모든 기기에 바로
            반영돼요.
          </p>
          <Bullets
            items={[
              '요금제 제한 없이 모든 플랜에서 쓸 수 있어요.',
              '입력 중인 숫자는 화면끼리만 실시간 공유되고, "전체 저장"을 눌러야 실제 기록으로 저장돼요 -- 중간에 잘못 눌러도 안전해요.',
              '결석 체크는 그 반 전체가 아니라 오늘 측정에만 적용돼요(수련생 명단 자체는 그대로).',
            ]}
          />
        </GuideSection>

        <GuideSection icon={LayoutDashboard} title="대시보드">
          <p className="text-xs text-slate-500 font-medium">
            체육관 전체 현황과 반별 현황을 한눈에 보는 화면이에요. 반을 배정한 학생이 있어야 반별 카드가
            나타나요.
          </p>
          <Bullets
            items={[
              '상단 4개 요약: 전체 수련생 수 · 이번달 신규 등록 · 이번달 측정 건수 · 이번달 신기록 갱신 건수.',
              '반별 카드: 인원수, 이번달 신기록을 세운 인원 비율(진행바), 평균 종합점수, 반 1위 학생을 보여줘요.',
              '반별 카드는 이번달 신기록 갱신 비율이 높은 반부터 순서대로 정렬돼요.',
              '반을 지정하지 않은 학생은 "미배정" 카드로 따로 모여요.',
            ]}
          />
        </GuideSection>

        <GuideSection icon={ListChecks} title="종목 관리">
          <p className="text-xs text-slate-500 font-medium">
            기본 6종목 외에 체육관만의 특화 종목(예: 2중 3단계 30초)을 추가할 수 있어요. 추가한 종목은 기록관리
            드롭다운, 엑셀 양식, 랭킹보드 탭에 바로 반영됩니다.
          </p>
          <Bullets
            items={[
              '무료 플랜은 기본 6종목만 이용할 수 있어요. 베이직은 커스텀 종목을 3개까지 추가할 수 있고(총 9종목), 프로는 무제한이에요.',
              '각 종목 카드의 "표준 기준: 우수 N회 / 프로 M회" 부분을 누르면 그 체육관만의 기준으로 직접 수정할 수 있어요 -- 체육관마다 수련생 수준이 달라서 기본값은 참고용이에요.',
              '기본 종목을 실수로 삭제했다면 "기본 종목 초기화"로 되돌릴 수 있어요.',
            ]}
          />
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
            <Pencil className="w-3.5 h-3.5" />
            <span>표준 기준 직접 수정 가능</span>
          </div>
        </GuideSection>

        <GuideSection icon={Users} title="수련생 관리">
          <p className="text-xs text-slate-500 font-medium">
            개별 등록, 엑셀 명단 일괄 등록, 그리고 "반/수업시간"(1부, 2부처럼 원하는 이름으로) 지정까지 여기서
            해요.
          </p>
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
          <Bullets
            items={[
              '학생 카드의 "반 지정" 배지를 누르면 바로 그 자리에서 반을 입력/수정할 수 있어요.',
              '요일마다 다른 반에 오는 학생은 콤마(,)로 구분해서 여러 반을 함께 입력할 수 있어요 (예: 월1부, 화2부).',
              '이미 등록된 학생도 명단 엑셀에 "반" 열만 채워서 다시 올리면 반 정보만 갱신돼요(이름/학년은 안 바뀜).',
              '반을 지정하면 랭킹보드/기록관리/대시보드에 반 필터가 자동으로 나타나요.',
              '"전체 반" 필터 옆에 "미배정"을 고르면 아직 반이 없는 학생만 걸러볼 수 있어요.',
            ]}
          />
        </GuideSection>

        <GuideSection icon={Tv} title="TV 전광판">
          <p className="text-xs text-slate-500 font-medium">
            체육관 모니터에 띄워두는 화면이에요. Version 1/2/3 세 가지 방식이 있고, 낮은 순위 아이들도 자기
            이름이 나올 때까지 기다릴 수 있도록 셋 다 전체 인원을 끝까지 순서대로 보여줘요(상위 몇 명만 보여주고
            끝나지 않아요).
          </p>
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
          <Bullets
            items={[
              'Version 1 (자동 전환): 종목이 순서대로 넘어가면서, 한 종목 안에서도 1~10위, 11~20위 ... 순서로 전체 인원을 끝까지 보여줘요.',
              'Version 2 (고정 화면): "종합 순위"(기본 6종목 합산), "종목별 한눈에 보기"(6종목 미니 순위 동시 표시), "종목별 순위"(커스텀 포함 종목 하나 고정) 중 골라서 볼 수 있고, 셋 다 전체 인원을 끝까지 페이지 넘기며 보여줘요.',
              'Version 3 (부별 보기): 반 하나를 고정으로 보거나 "전체 반 순차 표시"로 반이 자동으로 바뀌면서, 그 반 학생들의 종목별 순위를 끝까지 보여줘요.',
              '화면 넘어가는 속도(3~10초)는 세 버전 모두 각자 따로 설정할 수 있어요. 화면 아래 초록색 바가 다음 화면까지 남은 시간이에요.',
            ]}
          />
        </GuideSection>

        <GuideSection icon={Globe} title="전체랭킹">
          <p className="text-xs text-slate-500 font-medium">
            로그인 없이 누구나 볼 수 있는 전국(전체 체육관) 랭킹이에요. 보는 건 모든 플랜이 무료지만, 우리
            체육관 학생이 랭킹에 "참가"해서 뜨려면 베이직 이상이 필요해요.
          </p>
        </GuideSection>

        <GuideSection icon={Share2} title="공개 링크">
          <p className="text-xs text-slate-500 font-medium">
            로그인 없이 학부모님이 바로 볼 수 있는 우리 체육관 전용 링크예요. 사이드바의 "공개 링크"를 누르면 새
            탭으로 열립니다. 카톡/문자로 그대로 공유하면 돼요.
          </p>
        </GuideSection>

        <GuideSection icon={Sparkles} title="요금제">
          <Bullets
            items={[
              'FREE: 학생 50명, 기본 6종목만.',
              'BASIC: 학생 150명, 커스텀 종목 +3개/엑셀 대량 등록/광고 제거, 전체랭킹 참가 가능.',
              'PRO: 학생 수 무제한, 커스텀 종목 무제한, 기록 인증 상장 발급, 체육관 로고 사용.',
            ]}
          />
        </GuideSection>

        <GuideSection icon={UserCog} title="마이페이지">
          <p className="text-xs text-slate-500 font-medium">
            체육관 이름, 공개 링크 주소(슬러그), 비밀번호, 구독/결제, 체육관 로고를 여기서 관리해요.
          </p>
          <Bullets
            items={[
              '구독 관리 카드에서 결제 수단·다음 결제일·결제 내역을 확인하고, 주기(월간/연간) 변경이나 구독 해지를 할 수 있어요.',
              '체육관 로고는 프로 플랜 전용이에요. 업로드하면 사이드바, 공개 게시판, TV 전광판의 색상 이니셜 아바타를 대체해서 표시돼요.',
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

      <div className="mt-6 flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          더 궁금한 점이나 개선 아이디어가 있으면 언제든 말씀해 주세요.
        </p>
      </div>
    </div>
  );
};
