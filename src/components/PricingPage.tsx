import React, { useState } from 'react';
import { Check, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Gym } from '../data/api/gyms';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useGymData';
import { useTossRedirect } from '../hooks/useTossRedirect';
import { requestOneTimePayment } from '../lib/tossPayments';
import { planAmount } from '../data/pricing';

type BillingCycle = 'monthly' | 'yearly';

interface Tier {
  key: 'free' | 'basic' | 'pro';
  name: string;
  monthlyPrice: number;
  studentLimit: number;
  features: string[];
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
      '전체랭킹 열람',
      '광고 표시 예정',
    ],
  },
  {
    key: 'basic',
    name: 'BASIC',
    monthlyPrice: 4900,
    studentLimit: 150,
    features: [
      '커스텀 종목 +5개 추가',
      '기록관리 (전체 이력)',
      '엑셀 대량 등록',
      '전체랭킹 참가',
    ],
  },
  {
    key: 'pro',
    name: 'PRO',
    monthlyPrice: 9900,
    studentLimit: Infinity,
    features: [
      '기록 인증 상장 발급',
      '커스텀 종목 무제한',
      '학생 수 무제한',
      '체육관 로고 사용 (예정)',
      '전체랭킹 지역별·전국 확산 참가 (예정)',
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
  const { subscription, ensureSubscription } = useSubscription();
  // gym.plan alone isn't proof of a real subscription -- a plan can be set
  // (e.g. manually, or from a past state) with no gym_subscriptions record
  // behind it. Only treat a paid tier as "current" when there's an actual
  // active subscription, otherwise the pay button would stay hidden forever
  // with no way to ever register real billing for it.
  const hasActiveSubscription = subscription?.status === 'active';
  const { banner, setBanner } = useTossRedirect();
  const [subscribingKey, setSubscribingKey] = useState<Tier['key'] | null>(null);
  // Required pre-payment consent, shown just above the plan cards -- Toss's
  // card-company review expects an explicit "주문내용 확인 및 결제진행 동의"
  // step captured right before the pay button, not a silent click-to-pay.
  const [agreedToPayment, setAgreedToPayment] = useState(false);

  const handleSubscribe = async (tierKey: 'basic' | 'pro') => {
    if (!agreedToPayment) return;
    setBanner(null);
    setSubscribingKey(tierKey);
    try {
      const sub = await ensureSubscription();
      const amount = planAmount(tierKey, billingCycle);
      const orderId = `${gym.id}-${Date.now()}`;
      const orderName = `줄넘기 랭킹보드 ${tierKey.toUpperCase()} 플랜 (${billingCycle === 'yearly' ? '연간' : '월간'})`;
      const params = new URLSearchParams({
        view: 'PRICING',
        billing: 'success',
        customerKey: sub.customerKey,
        plan: tierKey,
        cycle: billingCycle,
      });
      const failParams = new URLSearchParams({ view: 'PRICING', billing: 'fail' });
      await requestOneTimePayment(
        sub.customerKey,
        orderId,
        orderName,
        amount,
        `/admin?${params.toString()}`,
        `/admin?${failParams.toString()}`,
        user?.email,
        gym.name
      );
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : '결제를 시작하지 못했어요.' });
      setSubscribingKey(null);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold text-slate-900 mb-2">요금제</h1>
        <p className="text-sm text-slate-500 font-medium">
          체육관 규모에 맞는 플랜을 선택하세요.
        </p>
      </div>

      {banner && (
        <div
          className={`mb-6 max-w-xl mx-auto rounded-xl p-3.5 flex items-center gap-2.5 text-xs font-bold ${
            banner.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {gym.plan !== 'free' && (
        <p className="mb-6 max-w-xl mx-auto text-center text-xs text-slate-500 font-medium">
          카드 변경, 구독 해지, 결제 내역은{' '}
          <span className="font-bold text-slate-700">마이페이지</span>에서 관리할 수 있어요.
        </p>
      )}

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

      <label className="flex items-start gap-2 max-w-xl mx-auto mb-6 text-xs text-slate-600 font-medium cursor-pointer px-2">
        <input
          type="checkbox"
          checked={agreedToPayment}
          onChange={(e) => setAgreedToPayment(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 accent-[#1B5E20] cursor-pointer"
        />
        <span>
          선택한 요금제의 금액과 결제 주기를 확인했으며, 결제 진행에 동의합니다. (필수)
        </span>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {TIERS.map((tier) => {
          const isCurrent = tier.key === 'free' ? gym.plan === 'free' : gym.plan === tier.key && hasActiveSubscription;
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
                {tier.studentLimit === Infinity ? '학생 수 무제한' : `최대 ${tier.studentLimit}명`}
              </p>

              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#1B5E20] shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] font-bold text-xs cursor-default"
                >
                  현재 이용중
                </button>
              ) : tier.key === 'basic' || tier.key === 'pro' ? (
                <button
                  type="button"
                  disabled={subscribingKey === tier.key || !agreedToPayment}
                  onClick={() => handleSubscribe(tier.key as 'basic' | 'pro')}
                  className="w-full py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{subscribingKey === tier.key ? '결제 화면으로 이동 중...' : '카드로 결제하고 구독하기'}</span>
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
    </div>
  );
};
