import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Lock, CreditCard, AlertCircle, CheckCircle2, Receipt, XCircle } from 'lucide-react';
import { Gym } from '../data/api/gyms';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, usePayments } from '../hooks/useGymData';
import { requestOneTimePayment } from '../lib/tossPayments';
import { ConfirmModal } from './ConfirmModal';

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

// Interim payment path (see requestOneTimePayment's doc comment) needs the
// same amount client-side (to invoke the widget) and server-side (source
// of truth for the confirm call) -- TIERS above already carries this per
// tier, this just resolves cycle too.
function tierAmount(tierKey: 'basic' | 'pro', cycle: BillingCycle): number {
  const tier = TIERS.find((t) => t.key === tierKey)!;
  return cycle === 'yearly' ? yearlyPrice(tier.monthlyPrice) : tier.monthlyPrice;
}

export const PricingPage: React.FC<PricingPageProps> = ({ gym }) => {
  const { refreshGym, user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscription, ensureSubscription, confirmPayment, cancelSubscription } = useSubscription();
  const { payments } = usePayments();
  const [subscribingKey, setSubscribingKey] = useState<Tier['key'] | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  // react-router hands back a new `searchParams` object identity on every
  // render, so this effect (deliberately dependent on it, to catch the
  // params changing) can re-fire mid-flight while confirmPayment is still
  // pending and clearParams() hasn't removed billing=success from the URL
  // yet -- without this guard that sent a second confirm call for the same
  // orderId, which Toss rejects as already-processed (seen as a spurious
  // error even though the first call had already succeeded).
  const processingOrderIdRef = useRef<string | null>(null);

  // Toss redirects the whole page back here after payment with
  // ?billing=success&paymentKey=&orderId=&customerKey=&plan=&cycle= (or
  // ?billing=fail). Runs once per redirect, then strips those params so a
  // refresh doesn't re-trigger the confirm call.
  useEffect(() => {
    const billing = searchParams.get('billing');
    if (!billing) return;

    const clearParams = () => {
      const next = new URLSearchParams(searchParams);
      ['billing', 'paymentKey', 'orderId', 'amount', 'customerKey', 'plan', 'cycle', 'code', 'message'].forEach((k) =>
        next.delete(k)
      );
      setSearchParams(next, { replace: true });
    };

    if (billing === 'fail') {
      const code = searchParams.get('code');
      const message = searchParams.get('message');
      setBanner({
        type: 'error',
        text: message
          ? `결제에 실패했어요: ${message}${code ? ` (${code})` : ''}`
          : '결제가 취소됐어요. 다시 시도해 주세요.',
      });
      clearParams();
      return;
    }

    if (billing === 'success') {
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const customerKey = searchParams.get('customerKey');
      const plan = searchParams.get('plan');
      const cycle = searchParams.get('cycle');
      if (!paymentKey || !orderId || !customerKey || !plan || !cycle) {
        setBanner({ type: 'error', text: '결제 정보가 올바르지 않아요. 다시 시도해 주세요.' });
        clearParams();
        return;
      }
      if (processingOrderIdRef.current === orderId) return;
      processingOrderIdRef.current = orderId;

      confirmPayment({
        paymentKey,
        orderId,
        customerKey,
        plan: plan as 'basic' | 'pro',
        billingCycle: cycle as 'monthly' | 'yearly',
      })
        .then(async () => {
          await refreshGym();
          setBanner({
            type: 'success',
            text: '결제가 완료됐어요! 플랜이 바로 적용됩니다. (자동 갱신은 아직 준비 중이라, 다음 결제일에 다시 결제해주셔야 해요.)',
          });
        })
        .catch((err) => {
          setBanner({ type: 'error', text: err instanceof Error ? err.message : '결제 처리 중 오류가 발생했어요.' });
        })
        .finally(() => {
          clearParams();
          processingOrderIdRef.current = null;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubscribe = async (tierKey: 'basic' | 'pro') => {
    setBanner(null);
    setSubscribingKey(tierKey);
    try {
      const sub = await ensureSubscription();
      const amount = tierAmount(tierKey, billingCycle);
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

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      await cancelSubscription();
      await refreshGym();
      setBanner({ type: 'success', text: '구독이 해지됐어요. 지금부터 FREE 플랜으로 이용됩니다.' });
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : '구독 해지 중 오류가 발생했어요.' });
    } finally {
      setIsCanceling(false);
      setShowCancelConfirm(false);
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
        <div className="mb-6 max-w-xl mx-auto rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between gap-3 text-xs flex-wrap">
          <span className="flex items-center gap-2 font-bold text-slate-700">
            <CreditCard className="w-4 h-4 text-slate-400" />
            {subscription.cardCompany ?? '카드'} {subscription.cardLast4 ? `**** ${subscription.cardLast4}` : ''}
          </span>
          <span className="text-slate-500 font-medium">
            {subscription.status === 'active' && subscription.nextBillingDate
              ? `다음 결제 예정일 ${subscription.nextBillingDate} (자동 갱신 전까지는 직접 결제해주세요)`
              : subscription.status === 'past_due'
              ? '결제 기한이 지났어요 - 다시 결제해 주세요'
              : subscription.status === 'canceled'
              ? '구독 해지됨'
              : ''}
          </span>
          {subscription.status === 'active' && (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>구독 해지</span>
            </button>
          )}
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
              ) : isCurrent && tier.key === 'basic' ? (
                <div className="space-y-1.5">
                  <div className="w-full py-2.5 rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] font-bold text-xs text-center">
                    현재 이용중
                  </div>
                  <button
                    type="button"
                    disabled={subscribingKey === tier.key}
                    onClick={() => handleSubscribe('basic')}
                    className="w-full py-2 rounded-xl bg-white border border-[#1B5E20]/30 hover:bg-[#1B5E20]/5 disabled:opacity-60 text-[#1B5E20] font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>
                      {subscribingKey === tier.key ? '결제 화면으로 이동 중...' : '다시 결제하기 (주기·카드 변경)'}
                    </span>
                  </button>
                </div>
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

      {payments.length > 0 && (
        <div className="mt-10 max-w-2xl mx-auto">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-slate-400" />
            <span>결제 내역</span>
          </h2>
          <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 overflow-hidden">
            {payments.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-800">
                    {p.plan.toUpperCase()} 플랜 ({p.billingCycle === 'yearly' ? '연간' : '월간'})
                  </div>
                  <div className="text-slate-400 font-mono mt-0.5">
                    {new Date(p.paidAt).toLocaleString('ko-KR')}
                  </div>
                  {p.status === 'failed' && p.failureReason && (
                    <div className="text-rose-500 font-medium mt-0.5">{p.failureReason}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-slate-900">{p.amount.toLocaleString()}원</div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    {p.status === 'paid' ? '결제완료' : '결제실패'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showCancelConfirm}
        title="구독 해지"
        message="구독을 해지하면 지금 바로 FREE 플랜으로 전환돼요. 자동 갱신이 아니라서 다시 해지를 무를 방법은 없고, 원하시면 언제든 다시 결제해서 재구독할 수 있어요. 해지할까요?"
        confirmText={isCanceling ? '해지 중...' : '해지하기'}
        variant="danger"
        onConfirm={handleCancel}
        onClose={() => setShowCancelConfirm(false)}
      />
    </div>
  );
};
