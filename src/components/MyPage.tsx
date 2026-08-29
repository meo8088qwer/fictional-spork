import React, { useState } from 'react';
import { Mail, Lock, Building2, AlertCircle, CheckCircle2, CreditCard, XCircle, Receipt, FileText, HelpCircle } from 'lucide-react';
import { Gym } from '../data/api/gyms';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, usePayments } from '../hooks/useGymData';
import { useTossRedirect } from '../hooks/useTossRedirect';
import { requestOneTimePayment } from '../lib/tossPayments';
import { planAmount, BillingCycle } from '../data/pricing';
import { PaymentRecord } from '../data/api/billing';
import { ConfirmModal } from './ConfirmModal';
import { ReceiptModal } from './ReceiptModal';

const SUPPORT_EMAIL = 'meo8088@naver.com';

interface MyPageProps {
  email: string | undefined;
  gym: Gym;
  onSaveName: (name: string) => Promise<void>;
  onSaveSlug: (slug: string) => Promise<void>;
  onSavePassword: (newPassword: string) => Promise<void>;
  onNavigateToPricing: () => void;
}

function sanitizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '');
}

export const MyPage: React.FC<MyPageProps> = ({
  email,
  gym,
  onSaveName,
  onSaveSlug,
  onSavePassword,
  onNavigateToPricing,
}) => {
  const [name, setName] = useState(gym.name);
  const [slug, setSlug] = useState(gym.slug);
  const [isSavingGym, setIsSavingGym] = useState(false);
  const [gymError, setGymError] = useState('');
  const [gymSuccess, setGymSuccess] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const { refreshGym } = useAuth();
  const { subscription, ensureSubscription, cancelSubscription } = useSubscription();
  const { payments } = usePayments();
  const { banner: billingBanner, setBanner: setBillingBanner } = useTossRedirect();
  const [repayCycle, setRepayCycle] = useState<BillingCycle>('monthly');
  const [isPaying, setIsPaying] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null);

  const paidPayments = payments.filter((p) => p.status === 'paid');
  const firstPaidAt = paidPayments.length > 0 ? paidPayments[paidPayments.length - 1].paidAt : null;

  const handleRepay = async () => {
    if (!subscription) return;
    setIsPaying(true);
    setBillingBanner(null);
    try {
      const sub = await ensureSubscription();
      const plan = subscription.desiredPlan;
      const amount = planAmount(plan, repayCycle);
      const orderId = `${gym.id}-${Date.now()}`;
      const orderName = `줄넘기 랭킹보드 ${plan.toUpperCase()} 플랜 (${repayCycle === 'yearly' ? '연간' : '월간'})`;
      const params = new URLSearchParams({
        view: 'MYPAGE',
        billing: 'success',
        customerKey: sub.customerKey,
        plan,
        cycle: repayCycle,
      });
      const failParams = new URLSearchParams({ view: 'MYPAGE', billing: 'fail' });
      await requestOneTimePayment(
        sub.customerKey,
        orderId,
        orderName,
        amount,
        `/admin?${params.toString()}`,
        `/admin?${failParams.toString()}`,
        email,
        gym.name
      );
    } catch (err) {
      setBillingBanner({ type: 'error', text: err instanceof Error ? err.message : '결제를 시작하지 못했어요.' });
      setIsPaying(false);
    }
  };

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      await cancelSubscription();
      await refreshGym();
      setBillingBanner({ type: 'success', text: '구독이 해지됐어요. 지금부터 FREE 플랜으로 이용됩니다.' });
    } catch (err) {
      setBillingBanner({ type: 'error', text: err instanceof Error ? err.message : '구독 해지 중 오류가 발생했어요.' });
    } finally {
      setIsCanceling(false);
      setShowCancelConfirm(false);
    }
  };

  const handleGymSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().replace(/-+$/, '');
    setGymSuccess('');
    if (!trimmedName) {
      setGymError('체육관 이름을 입력해 주세요.');
      return;
    }
    if (trimmedSlug.length < 3) {
      setGymError('공개 링크 주소는 최소 3자 이상이어야 해요.');
      return;
    }
    setIsSavingGym(true);
    setGymError('');
    try {
      if (trimmedName !== gym.name) await onSaveName(trimmedName);
      if (trimmedSlug !== gym.slug) await onSaveSlug(trimmedSlug);
      setGymSuccess('저장됐어요.');
    } catch (err) {
      setGymError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingGym(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    if (newPassword.length < 6) {
      setPasswordError('비밀번호는 최소 6자 이상이어야 해요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않아요.');
      return;
    }
    setIsSavingPassword(true);
    setPasswordError('');
    try {
      await onSavePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('비밀번호가 변경됐어요.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : '변경 중 오류가 발생했습니다.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-900 mb-6">마이페이지</h1>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-slate-400" />
          계정 정보
        </h2>
        <label className="text-xs font-bold text-slate-500 pl-1">아이디 (이메일)</label>
        <div className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-bold">
          {email}
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-slate-400" />
          구독 관리
        </h2>

        {billingBanner && (
          <div
            className={`mb-4 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              billingBanner.type === 'success'
                ? 'bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20]'
                : 'bg-rose-50 border border-rose-200 text-rose-600'
            }`}
          >
            {billingBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{billingBanner.text}</span>
          </div>
        )}

        {!subscription || subscription.status === 'none' ? (
          gym.plan === 'free' ? (
            <div className="text-center py-4">
              <p className="text-xs text-slate-500 font-medium mb-3">아직 구독 중인 플랜이 없어요. (현재 FREE 플랜)</p>
              <button
                type="button"
                onClick={onNavigateToPricing}
                className="px-4 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-xs transition-all cursor-pointer"
              >
                요금제 보러 가기
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-xs text-amber-800 font-bold mb-1">현재 {gym.plan.toUpperCase()} 플랜 이용중</p>
              <p className="text-[11px] text-amber-700 font-medium mb-3">
                연결된 결제 정보가 없어요. 결제를 진행하면 결제 수단, 다음 결제일, 결제 내역이 여기에 표시돼요.
              </p>
              <button
                type="button"
                onClick={onNavigateToPricing}
                className="px-4 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-xs transition-all cursor-pointer"
              >
                결제 정보 등록하기
              </button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-900">
                  {subscription.desiredPlan.toUpperCase()} 플랜
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    subscription.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : subscription.status === 'past_due'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {subscription.status === 'active'
                    ? '이용중'
                    : subscription.status === 'past_due'
                    ? '결제 기한 지남'
                    : '구독 해지됨'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                {firstPaidAt && (
                  <div className="flex justify-between py-1 border-b border-slate-200/70">
                    <span className="text-slate-500 font-medium">최초 결제일</span>
                    <span className="font-bold text-slate-800">
                      {new Date(firstPaidAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-200/70">
                  <span className="text-slate-500 font-medium">결제 정보</span>
                  <span className="font-bold text-slate-800">
                    {subscription.cardCompany ?? '카드'}
                    {subscription.cardLast4 ? ` **** ${subscription.cardLast4}` : ''}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">다음 결제 예정일</span>
                  <span className="font-bold text-slate-800">
                    {subscription.status === 'active' && subscription.nextBillingDate
                      ? `${subscription.nextBillingDate} (${planAmount(
                          subscription.desiredPlan,
                          subscription.billingCycle
                        ).toLocaleString()}원)`
                      : subscription.status === 'past_due'
                      ? '결제 기한이 지났어요'
                      : '-'}
                  </span>
                </div>
              </div>
              {subscription.status === 'active' && (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="mt-3 text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer text-xs"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>구독 해지</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRepayCycle('monthly')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    repayCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  월간
                </button>
                <button
                  type="button"
                  onClick={() => setRepayCycle('yearly')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    repayCycle === 'yearly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  연간
                </button>
              </div>
              <button
                type="button"
                disabled={isPaying}
                onClick={handleRepay}
                className="px-4 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-60 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{isPaying ? '결제 화면으로 이동 중...' : '다시 결제하기 (주기·카드 변경)'}</span>
              </button>
            </div>

            {payments.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    결제 내역
                  </h3>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                      '[ROPERANK] 환불 요청'
                    )}&body=${encodeURIComponent(
                      `체육관: ${gym.name}\n이메일: ${email ?? ''}\n환불 요청 내용을 적어주세요.`
                    )}`}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>환불 문의</span>
                  </a>
                </div>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {payments.map((p) => (
                    <div key={p.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
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
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <div className="font-bold text-slate-900">{p.amount.toLocaleString()}원</div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                            }`}
                          >
                            {p.status === 'paid' ? '결제완료' : '결제실패'}
                          </span>
                          {p.status === 'paid' && (
                            <button
                              type="button"
                              onClick={() => setReceiptPayment(p)}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2 cursor-pointer flex items-center gap-0.5"
                            >
                              <FileText className="w-3 h-3" />
                              영수증
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          gymName={gym.name}
          payerEmail={email}
          onClose={() => setReceiptPayment(null)}
        />
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

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-slate-400" />
          비밀번호 변경
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 pl-1">새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="6자 이상"
              className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 pl-1">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="한 번 더 입력"
              className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
            />
          </div>

          {passwordError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingPassword}
            className="w-full py-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-60 text-white font-bold text-xs transition-all cursor-pointer"
          >
            {isSavingPassword ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-slate-400" />
          체육관 설정
        </h2>
        <form onSubmit={handleGymSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 pl-1">체육관 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setGymError('');
              }}
              placeholder="체육관 이름"
              className="mt-1.5 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 pl-1">공개 링크 주소</label>
            <div className="mt-1.5 flex items-center rounded-xl bg-slate-50 border border-slate-300 focus-within:ring-2 focus-within:ring-[#66BB6A] focus-within:bg-white transition-all overflow-hidden">
              <span className="pl-4 py-3 text-xs font-medium text-slate-400 whitespace-nowrap">
                roperank.com/g/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(sanitizeSlugInput(e.target.value));
                  setGymError('');
                }}
                placeholder="my-gym"
                className="min-w-0 flex-1 pr-4 py-3 bg-transparent text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium pl-1 mt-1">
              영문 소문자, 숫자, 하이픈(-)만 사용할 수 있어요.
            </p>
          </div>

          {gymError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gymError}</span>
            </div>
          )}
          {gymSuccess && (
            <div className="bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{gymSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingGym}
            className="w-full py-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-60 text-white font-bold text-xs transition-all cursor-pointer"
          >
            {isSavingGym ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>
    </div>
  );
};
