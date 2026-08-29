import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoMark from '../assets/logo-mark.webp';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-base font-bold text-slate-900 mb-3">{title}</h2>
    <div className="space-y-3 text-sm text-slate-700 leading-relaxed">{children}</div>
  </section>
);

export default function TermsOfServicePage() {
  useEffect(() => {
    document.title = '이용약관 | ROPERANK';
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
        <h1 className="text-xl font-bold text-slate-900 mb-1">이용약관</h1>
        <p className="text-xs text-slate-400 font-medium mb-8">시행일: 2026.08.29</p>

        <Section title="제1조 (목적)">
          <p>
            이 약관은 ROPERANK(이하 "회사")가 제공하는 줄넘기 기록 관리 및 랭킹보드 서비스(이하 "서비스")의
            이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로
            합니다.
          </p>
        </Section>

        <Section title="제2조 (정의)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>"서비스"란 회사가 제공하는 줄넘기 기록 관리, 랭킹보드, TV 전광판, 공개 링크 등 일체의 기능을 말합니다.</li>
            <li>"회원"이란 이 약관에 동의하고 회사와 이용계약을 체결하여 서비스를 이용하는 체육관 운영자(관장님)를 말합니다.</li>
            <li>"수련생 정보"란 회원이 서비스 이용 과정에서 직접 입력하는 수련생(학생)의 이름, 기록 등 정보를 말합니다.</li>
            <li>"유료 플랜"이란 회사가 정한 요금을 지불하고 이용하는 BASIC, PRO 등 서비스 등급을 말합니다.</li>
          </ul>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다.</li>
            <li>
              회사는 관련 법령을 위반하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시 적용일자 및
              변경사유를 명시하여 최소 7일 전(회원에게 불리한 변경의 경우 30일 전)부터 서비스 내 공지합니다.
            </li>
            <li>회원이 변경된 약관에 동의하지 않는 경우, 이용계약을 해지할 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="제4조 (서비스의 제공 및 변경)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>회사는 회원에게 아래와 같은 서비스를 제공합니다.</li>
            <li className="pl-4">- 수련생 기록 등록·관리 및 랭킹보드 제공</li>
            <li className="pl-4">- TV 전광판, 공개 링크 등 기록 공유 기능</li>
            <li className="pl-4">- 그 밖에 회사가 추가로 개발하거나 제휴를 통해 제공하는 서비스</li>
            <li>
              회사는 서비스의 내용, 운영상 또는 기술상 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경할
              수 있으며, 이 경우 변경 내용을 사전에 공지합니다.
            </li>
          </ul>
        </Section>

        <Section title="제5조 (서비스의 중단)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              회사는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신두절 등의 사유가 발생한 경우 서비스
              제공을 일시적으로 중단할 수 있습니다.
            </li>
            <li>
              회사는 사업 종목의 전환, 폐업, 회사 간 통합 등의 사유로 서비스를 제공할 수 없게 되는 경우 회원에게
              사전 통지하고, 관련 법령에서 정한 절차에 따라 처리합니다.
            </li>
          </ul>
        </Section>

        <Section title="제6조 (회원가입)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>회원가입은 이용자가 약관에 동의하고 이메일·비밀번호·체육관 이름을 입력하여 신청합니다.</li>
            <li>
              회사는 가입신청에 대해 서비스 이용을 승낙함을 원칙으로 하나, 타인의 정보를 도용한 경우, 허위
              정보를 기재한 경우 등에는 승낙을 유보하거나 거절할 수 있습니다.
            </li>
          </ul>
        </Section>

        <Section title="제7조 (이용요금 및 결제)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              서비스는 무료 플랜(FREE)과 유료 플랜(BASIC, PRO)으로 구성되며, 유료 플랜의 요금·혜택은 요금제
              페이지에 안내된 내용에 따릅니다.
            </li>
            <li>
              <strong>본 서비스의 유료 플랜은 자동으로 갱신·청구되지 않습니다.</strong> 결제는 회원이 결제
              시점마다 직접 카드 결제를 진행하는 방식이며, 결제 주기(월간/연간)가 종료되어도 자동으로 다음
              결제가 이루어지지 않습니다. 재결제하지 않을 경우 유예기간(3일) 경과 후 자동으로 무료 플랜으로
              전환됩니다.
            </li>
            <li>결제는 토스페이먼츠를 통한 신용/체크카드 결제로 처리되며, 카드 정보는 회사 서버에 저장되지 않습니다.</li>
            <li>
              서비스는 결제 즉시 제공이 개시되는 디지털 서비스의 특성상, 정상적으로 서비스가 제공된 이후에는
              전자상거래법 제17조 제2항 등에 따라 청약철회가 제한될 수 있습니다. 다만 이중 결제, 서비스 오류 등
              회사의 귀책사유가 있는 경우 마이페이지의 "환불 문의"를 통해 요청하실 수 있으며, 회사는 확인 후
              합리적인 범위에서 환불을 처리합니다.
            </li>
          </ul>
        </Section>

        <Section title="제8조 (계약해지 및 이용제한)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              회원은 마이페이지의 "구독 해지" 기능을 통해 언제든지 자유롭게 유료 플랜을 해지할 수 있습니다.
              해지 시 즉시 무료 플랜으로 전환되며, 이미 결제한 금액에 대한 일할 환불은 제공되지 않습니다.
            </li>
            <li>
              회원이 이 약관 또는 관련 법령을 위반한 경우, 회사는 사전 통지 후 서비스 이용을 제한하거나
              이용계약을 해지할 수 있습니다.
            </li>
            <li>회원은 언제든지 마이페이지 또는 고객센터를 통해 회원 탈퇴를 요청할 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="제9조 (회원의 의무)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>회원은 가입 시 정확한 정보를 제공해야 하며, 타인의 정보를 도용해서는 안 됩니다.</li>
            <li>
              회원은 수련생(학생) 정보를 서비스에 입력함에 있어 관련 법령을 준수해야 하며, 만 14세 미만
              아동의 정보를 입력하는 경우 법정대리인의 동의를 받아야 합니다.
            </li>
            <li>회원은 서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이 복제, 유통, 상업적으로 이용할 수 없습니다.</li>
            <li>회원은 서비스의 안정적인 운영을 방해하는 행위(비정상적인 대량 요청, 해킹 시도 등)를 해서는 안 됩니다.</li>
          </ul>
        </Section>

        <Section title="제10조 (회사의 의무)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>회사는 관련 법령과 이 약관이 정하는 바에 따라 지속적이고 안정적인 서비스 제공을 위해 노력합니다.</li>
            <li>회사는 회원의 개인정보를 개인정보처리방침에 따라 안전하게 관리합니다.</li>
            <li>
              회사는 서비스 이용과 관련한 회원의 의견이나 불만이 정당하다고 인정될 경우 이를 처리하기 위해
              노력합니다.
            </li>
          </ul>
        </Section>

        <Section title="제11조 (저작권의 귀속 및 이용제한)">
          <p>
            서비스에 대한 저작권 및 지적재산권은 회사에 귀속됩니다. 다만 회원이 직접 입력한 수련생 기록
            데이터의 소유권은 회원에게 있으며, 회사는 서비스 제공 및 개인정보처리방침에서 안내한 목적
            범위에서만 이를 이용합니다.
          </p>
        </Section>

        <Section title="제12조 (면책조항)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              회사는 천재지변, 정전, 통신사·클라우드 인프라(Supabase, Vercel 등) 장애 등 회사의 고의·과실이
              없는 사유로 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.
            </li>
            <li>회사는 회원이 서비스에 입력한 정보(수련생 기록 등)의 정확성에 대해 책임을 지지 않습니다.</li>
            <li>회사는 회원 간 또는 회원과 제3자 간에 서비스를 매개로 발생한 분쟁에 개입하지 않습니다.</li>
          </ul>
        </Section>

        <Section title="제13조 (분쟁해결 및 관할법원)">
          <p>
            이 약관과 관련하여 회사와 회원 간에 발생한 분쟁에 대해서는 대한민국 법을 적용하며, 소송이
            제기될 경우 민사소송법상의 관할법원에 제기합니다.
          </p>
        </Section>

        <Section title="부칙">
          <p>이 약관은 2026.08.29부터 적용됩니다.</p>
        </Section>

        <div className="mt-10 pt-6 border-t border-slate-100 text-xs text-slate-400 font-medium">
          문의: ROPERANK 정승현 · meo8088@naver.com
        </div>
      </main>
    </div>
  );
}
