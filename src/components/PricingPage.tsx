import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Lock, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Gym } from '../data/api/gyms';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useGymData';
import { requestCardRegistration } from '../lib/tossPayments';

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
  const { refreshGym, user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscription, ensureSubscription, activateBilling } = useSubscription();
  const [subscribingKey, setSubscribingKey] = useState<Tier['key'] | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Toss redirects the whole page back here after card registration with
  // ?billing=success&authKey=&customerKey=&plan=&cycle= (or ?billing=fail).
  // Runs once per redirect, then strips those params so a refresh doesn't
  // re-trigger the charge.
  useEffect(() => {
    const billing = searchParams.get('billing');
    if (!billing) return;

    const clearParams = () => {
      const next = new URLSearchParams(searchParams);
      ['billing', 'authKey', 'customerKey', 'plan', 'cycle', 'code', 'message'].forEach((k) => next.delete(k));
      setSearchParams(next, { replace: true });
    };

    if (billing === 'fail') {
      const code = searchParams.get('code');
      const message = searchParams.get('message');
      setBanner({
        type: 'error',
        text: message
          ? `카드 등록에 실패했어요: ${message}${code ? ` (${code})` : ''}`
          : '카드 등록이 취소되었어요. 다시 시도해 주세요.',
      });
      clearParams();
      return;
    }

    if (billing === 'success') {
      const authKey = searchParams.get('authKey');
      const customerKey = searchParams.get('customerKey');
      const plan = searchParams.get('plan');
      const cycle = searchParams.get('cycle');
      if (!authKey || !customerKey || !plan || !cycle) {
        setBanner({ type: 'error', text: '결제 정보가 올바르지 않아요. 다시 시도해 주세요.' });
        clearParams();
        return;
      }

      activateBilling({
        authKey,
        customerKey,
        plan: plan as 'basic' | 'pro',
        billingCycle: cycle as 'monthly' | 'yearly',
      })
        .then(async () => {
          await refreshGym();
          setBanner({ type: 'success', text: '구독이 시작됐어요! 플랜이 바로 적용됩니다.' });
        })
        .catch((err) => {
          setBanner({ type: 'error', text: err instanceof Error ? err.message : '결제 처리 중 오류가 발생했어요.' });
        })
        .finally(clearParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubscribe = async (tierKey: 'basic' | 'pro') => {
    setBanner(null);
    setSubscribingKey(tierKey);
    try {
      const sub = await ensureSubscription();
      const params = new URLSearchParams({ view: 'PRICING', billing: 'success', plan: tierKey, cycle: billingCycle });
      const failParams = new URLSearchParams({ view: 'PRICING', billing: 'fail' });
      await requestCardRegistration(
        sub.customerKey,
        `/admin?${params.toString()}`,
        `/admin?${failParams.toString()}`,
        user?.email,
        gym.name
      );
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : '카드 등록을 시작하지 못했어요.' });
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

      {subscription && subscription.status !== 'none' && (
        <div className="mb-6 max-w-xl mx-auto rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-2 font-bold text-slate-700">
            <CreditCard className="w-4 h-4 text-slate-400" />
            {subscription.cardCompany ?? '카드'} {subscription.cardLast4 ? `**** ${subscription.cardLast4}` : ''}
          </span>
          <span className="text-slate-500 font-medium">
            {subscription.status === 'active' && subscription.nextBillingDate
              ? `다음 결제일 ${subscription.nextBillingDate}`
              : subscription.status === 'past_due'
              ? '결제 실패 - 카드 정보를 확인해 주세요'
              : subscription.status === 'canceled'
              ? '구독 해지됨'
              : ''}
          </span>
        </div>
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
                  disabled={subscribingKey === tier.key}
                  onClick={() => handleSubscribe(tier.key as 'basic')}
                  className="w-full py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-60 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{subscribingKey === tier.key ? '카드 등록 화면으로 이동 중...' : '카드 등록하고 구독하기'}</span>
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
