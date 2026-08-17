import React, { useState } from 'react';
import { Check, Lock, Mail, X } from 'lucide-react';
import { Gym } from '../data/api/gyms';
import { useAuth } from '../contexts/AuthContext';

// Contact address for the manual "subscribe" flow below -- there's no
// payment gateway wired up yet, so a Basic signup becomes an email lead the
// gym owner (you) follows up on with bank transfer details by hand. Swap
// this for a dedicated business inbox or KakaoTalk channel whenever you'd
// rather that not be your personal address.
const SUPPORT_EMAIL = 'a01099988088@gmail.com';

type BillingCycle = 'monthly' | 'yearly';

interface Tier {
  key: 'free' | 'basic' | 'pro';
  name: string;
  monthlyPrice: number;
  studentLimit: number;
  features: string[];
  comingSoon?: boolean;
}

const TIERS: Tier[] = [
  {
    key: 'free',
    name: 'FREE',
    monthlyPrice: 0,
    studentLimit: 50,
    features: [
      '랭킹보드',
      '기록관리 (최근 3개월)',
      '성장그래프',
      '공개 링크',
      'TV 전광판',
      '광고 표시됨',
    ],
  },
  {
    key: 'basic',
    name: 'BASIC',
    monthlyPrice: 4900,
    studentLimit: 150,
    features: [
      '추가 종목 등록 가능',
      '기록관리 (전체 이력)',
      '엑셀 대량 등록',
      '기록 인증 상장 발급',
      '광고 없음',
    ],
  },
  {
    key: 'pro',
    name: 'PRO',
    monthlyPrice: 9900,
    studentLimit: 500,
    comingSoon: true,
    features: [
      '체육관 계정 2개 이용',
      '광고 없음',
      '체육관 로고 사용',
      '고급 통계 (업데이트 예정)',
      '대회 모드 참가 (업데이트 예정)',
    ],
  },
];

// 2 months free on yearly = pay for 10 months -> ~17% off, matching the
// marketing copy exactly without needing a separate discount constant.
const yearlyPrice = (monthlyPrice: number) => monthlyPrice * 10;

interface PricingPageProps {
  gym: Gym;
}

export const PricingPage: React.FC<PricingPageProps> = ({ gym }) => {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [showContactModal, setShowContactModal] = useState(false);

  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    '베이직 플랜 구독 신청'
  )}&body=${encodeURIComponent(
    `체육관: ${gym.name}\n이메일: ${user?.email ?? ''}\n결제 주기: ${
      billingCycle === 'yearly' ? '연간' : '월간'
    }\n\n(결제 안내를 회신으로 보내주세요.)`
  )}`;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold text-slate-900 mb-2">요금제</h1>
        <p className="text-sm text-slate-500 font-medium">
          체육관 규모에 맞는 플랜을 선택하세요.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            월간 결제
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            연간 결제
          </button>
        </div>
        {billingCycle === 'yearly' && (
          <p className="text-[11px] font-bold text-[#1B5E20]">
            🔥 연간 결제 시 약 17% 할인 · 2개월 무료
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {TIERS.map((tier) => {
          const isCurrent = gym.plan === tier.key;
          const isBasicHighlight = tier.key === 'basic';
          const price =
            tier.monthlyPrice === 0
              ? 0
              : billingCycle === 'yearly'
              ? yearlyPrice(tier.monthlyPrice)
              : tier.monthlyPrice;

          return (
            <div
              key={tier.key}
              className={`rounded-2xl p-6 flex flex-col ${
                isBasicHighlight
                  ? 'bg-[#E8F5E9]/50 border-2 border-[#1B5E20] shadow-md'
                  : 'bg-white border border-slate-200/90'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-bold text-slate-900 tracking-wide">{tier.name}</h2>
                {isBasicHighlight && (
                  <span className="px-2 py-0.5 rounded-full bg-[#1B5E20] text-white text-[10px] font-bold">
                    추천
                  </span>
                )}
                {tier.comingSoon && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                    추후 오픈 예정
                  </span>
                )}
              </div>

              <div className="mb-1">
                <span className="text-3xl font-bold text-slate-900">
                  {price === 0 ? '0' : price.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-semibold ml-1">
                  원{price > 0 ? (billingCycle === 'yearly' ? ' / 년' : ' / 월') : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-5">
                최대 {tier.studentLimit}명
              </p>

              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#1B5E20] shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.comingSoon ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>추후 오픈 예정</span>
                </button>
              ) : isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] font-bold text-xs cursor-default"
                >
                  현재 이용중
                </button>
              ) : tier.key === 'basic' ? (
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="w-full py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  구독하기
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-default"
                >
                  기본 플랜
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs grid place-items-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">베이직 플랜 구독 신청</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6">
                아직 자동결제 연동 전이라, 아래 버튼으로 신청 메일을 보내주시면
                입금 계좌 안내를 회신드려요. 입금 확인 후 24시간 이내로 플랜이 적용됩니다.
              </p>
              <a
                href={mailtoHref}
                className="w-full py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>구독 신청 메일 보내기</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
