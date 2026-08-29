import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoMark from '../assets/logo-mark.webp';

// Fields the gym-owner/operator has to fill in with real business info --
// I don't have (and shouldn't guess) their business registration details,
// address, or DPO contact. Rendered with a visible "채워야 함" flag so it's
// obvious this page isn't finished yet, instead of silently publishing
// fabricated legal claims.
const Placeholder: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-dashed border-amber-400 text-amber-800 font-bold">
    {children}
    <span className="text-[10px] uppercase tracking-wide">채워야 함</span>
  </span>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-base font-bold text-slate-900 mb-3">{title}</h2>
    <div className="space-y-3 text-sm text-slate-700 leading-relaxed">{children}</div>
  </section>
);

interface Row {
  cells: string[];
  note?: string;
}

const DataTable: React.FC<{ headers: string[]; rows: Row[] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto border border-slate-200 rounded-xl">
    <table className="w-full text-left text-xs border-collapse min-w-[480px]">
      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
        <tr>
          {headers.map((h) => (
            <th key={h} className="p-2.5">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row, i) => (
          <tr key={i}>
            {row.cells.map((c, j) => (
              <td key={j} className="p-2.5 align-top text-slate-700 font-medium">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = '개인정보처리방침 | ROPERANK';
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoMark} alt="" className="h-6 w-auto" />
            <span className="font-bold text-base tracking-tight text-slate-900">
              ROPE<span className="text-[#2E9E4F]">RANK</span>
            </span>
          </Link>
          <Link to="/" className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
            홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 lg:px-8 py-10">
        <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-bold leading-relaxed">
          이 페이지는 초안입니다. 노란색으로 표시된 부분을 실제 사업자 정보로 채워야 정식 게시할 수 있어요.
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-1">개인정보처리방침</h1>
        <p className="text-xs text-slate-400 font-medium mb-8">
          시행일: <Placeholder>시행일자 입력</Placeholder>
        </p>

        <p className="text-sm text-slate-700 leading-relaxed mb-8">
          <Placeholder>회사(운영자)명</Placeholder>(이하 "회사")는 「개인정보보호법」 등 관련 법령을 준수하며,
          이용자의 개인정보를 안전하게 처리하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <Section title="1. 수집하는 개인정보 항목">
          <h3 className="text-xs font-bold text-slate-800">1) 체육관 관장님(서비스 가입자) 정보</h3>
          <DataTable
            headers={['항목', '수집 방법', '목적', '필수 여부']}
            rows={[
              { cells: ['이메일', '회원가입 시 직접 입력', '로그인 계정 식별, 안내 발송', '필수'] },
              {
                cells: [
                  '비밀번호',
                  '회원가입 시 직접 입력',
                  '로그인 인증 (해시로 저장, 회사는 원문을 볼 수 없음)',
                  '필수',
                ],
              },
              { cells: ['체육관 이름, 공개 링크 주소', '가입/설정 시 직접 입력', '서비스 제공, 공개 랭킹보드 식별', '필수'] },
            ]}
          />

          <h3 className="text-xs font-bold text-slate-800 pt-2">2) 결제 관련 정보</h3>
          <DataTable
            headers={['항목', '수집 방법', '목적']}
            rows={[
              { cells: ['카드사명, 카드 마지막 4자리', '결제 시 결제대행사로부터 결과값 수신', '결제 내역 확인, 고객 문의 응대'] },
              { cells: ['결제 금액, 결제일시, 주문번호', '결제 처리 결과', '결제 내역 관리, 매출 관리'] },
            ]}
          />
          <p className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-xl p-3">
            카드 전체 번호, CVC, 비밀번호는 회사 서버에 전혀 전송·저장되지 않습니다. 결제 화면 자체가
            결제대행사(토스페이먼츠)가 직접 제공하는 결제창이며, 카드 원본 정보는 결제대행사가 PG사로서 직접
            수집·처리합니다.
          </p>

          <h3 className="text-xs font-bold text-slate-800 pt-2">3) 수련생(회원 학생) 정보 — 관장님이 직접 입력</h3>
          <DataTable
            headers={['항목', '목적', '필수 여부']}
            rows={[
              { cells: ['이름', '랭킹보드 표시, 기록 관리', '필수'] },
              { cells: ['학년/연령대', '학년별 랭킹 필터링', '필수'] },
              { cells: ['성별', '통계 구분', '선택 (없어도 서비스 이용에 지장 없음)'] },
              { cells: ['수련생 번호', '명단 관리', '필수 (자동 생성)'] },
              { cells: ['반/수업시간', '반별 그룹 관리', '선택'] },
              { cells: ['메모', '코치 개인 메모', '선택'] },
              { cells: ['줄넘기 측정 기록', '랭킹/성장 그래프 제공', '필수 (서비스 핵심 기능)'] },
            ]}
          />
          <p className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-xl p-3">
            수련생은 만 14세 미만 아동이 포함될 수 있습니다. 이 경우 법정대리인(학부모)의 동의를 받아 정보를
            입력해 주세요. '메모' 항목에는 자유 텍스트를 입력할 수 있으니, 학부모 연락처 등 민감할 수 있는
            정보는 가급적 적지 않는 것을 권장합니다.
          </p>

          <h3 className="text-xs font-bold text-slate-800 pt-2">4) 자동 수집 정보</h3>
          <DataTable
            headers={['항목', '수집 방법', '목적']}
            rows={[
              { cells: ['접속 IP, 접속 로그, 브라우저 정보', '서비스 운영 인프라가 자동 기록', '부정 이용 방지, 서비스 안정성'] },
            ]}
          />
        </Section>

        <Section title="2. 개인정보의 이용 목적">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>회원 가입 및 관리, 본인 확인</li>
            <li>서비스(줄넘기 기록 관리, 랭킹보드, TV 전광판, 공개 링크) 제공</li>
            <li>요금제 결제 및 결제 내역 관리</li>
            <li>서비스 개선 및 고객 문의 대응</li>
          </ul>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>회원 탈퇴 시: 지체 없이 파기 (단, 관계 법령에 따라 보존이 필요한 경우 예외)</li>
            <li>
              결제 관련 기록: <Placeholder>보유기간 확인 필요 (전자상거래법 등 관련 법령 확인)</Placeholder>
            </li>
            <li>
              소비자 불만 또는 분쟁 처리 기록: <Placeholder>보유기간 확인 필요</Placeholder>
            </li>
          </ul>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          <p>회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.</p>
        </Section>

        <Section title="5. 개인정보 처리업무의 위탁">
          <DataTable
            headers={['수탁업체', '위탁업무 내용', '위탁하는 개인정보 항목']}
            rows={[
              {
                cells: [
                  'Supabase, Inc.',
                  '회원 인증, 데이터베이스 호스팅',
                  '이메일, 비밀번호(해시), 체육관 정보, 수련생 정보, 결제 내역',
                ],
              },
              {
                cells: [
                  '토스페이먼츠(주)',
                  '결제(카드 결제) 처리',
                  '결제 카드 정보(회사에는 카드사명·마지막 4자리만 전달됨), 결제 금액, 주문 정보',
                ],
              },
              { cells: ['Vercel Inc.', '웹사이트 호스팅', '접속 로그(IP 등)'] },
            ]}
          />
          <p className="text-xs text-slate-400 font-medium">
            위 목록은 서비스가 실제로 데이터를 주고받는 외부 업체를 기준으로 작성했습니다. 이메일 발송,
            분석도구 등을 새로 연동하면 이 표에도 추가해야 합니다. 서버가 해외에 있는 경우 국외 이전에 해당할
            수 있어 <Placeholder>서버 소재지 확인 후 국외 이전 문구 추가 여부 결정</Placeholder> 이 필요합니다.
          </p>
        </Section>

        <Section title="6. 개인정보의 파기절차 및 방법">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>파기 절차: 목적 달성 후 내부 방침에 따라 일정 기간 저장된 후 파기되거나, 즉시 파기됩니다.</li>
            <li>파기 방법: 전자적 파일은 복구가 불가능한 방법으로 영구 삭제합니다.</li>
          </ul>
        </Section>

        <Section title="7. 이용자 및 법정대리인의 권리와 행사 방법">
          <p>
            이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제, 처리정지를 요청할 수 있습니다. 문의는 아래
            개인정보 보호책임자에게 연락해 주세요.
          </p>
        </Section>

        <Section title="8. 개인정보 보호책임자">
          <ul className="space-y-1">
            <li>
              성명: <Placeholder>이름 입력</Placeholder>
            </li>
            <li>
              직책: <Placeholder>직책 입력</Placeholder>
            </li>
            <li>
              연락처: <Placeholder>이메일 또는 전화번호 입력</Placeholder>
            </li>
          </ul>
        </Section>

        <Section title="9. 고지의 의무">
          <p>
            이 개인정보처리방침은 <Placeholder>시행일자 입력</Placeholder>부터 적용됩니다.
          </p>
        </Section>
      </main>
    </div>
  );
}
