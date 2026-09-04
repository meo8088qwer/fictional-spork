import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Users,
  UserPlus,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Gift,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  isPlatformAdmin,
  fetchOpsDashboardSummary,
  fetchOpsGymList,
  fetchOpsGymDetail,
  updateOpsGymPlan,
  OpsGymListItem,
} from '../data/api/ops';

const PAGE_SIZE = 20;

function Tile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="text-[11px] text-slate-500 font-bold">{label}</span>
      </div>
      <p className="text-xl font-black text-slate-900">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sub}</p>}
    </div>
  );
}

// Plain inline SVG bars -- this page is its own lazy chunk, so pulling in
// a chart library just for one trend strip isn't worth the extra weight.
function SignupBarChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-slate-400 font-medium py-6 text-center">데이터 없음</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 640;
  const height = 100;
  const barWidth = width / data.length;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-24">
      {data.map((d, i) => {
        const h = (d.count / max) * (height - 4);
        return (
          <rect
            key={d.date}
            x={i * barWidth + barWidth * 0.15}
            y={height - h}
            width={barWidth * 0.7}
            height={h}
            rx={2}
            fill="#1B5E20"
          >
            <title>
              {d.date}: {d.count}건
            </title>
          </rect>
        );
      })}
    </svg>
  );
}

const PLAN_LABEL: Record<string, string> = { free: 'FREE', basic: 'BASIC', pro: 'PRO' };

const DURATION_OPTIONS = [
  { value: 'permanent', label: '기간 없음(영구)' },
  { value: '1', label: '1개월' },
  { value: '2', label: '2개월' },
  { value: '3', label: '3개월' },
  { value: '6', label: '6개월' },
];

function GymDetailPanel({ gymId, onClose }: { gymId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState<'free' | 'basic' | 'pro'>('free');
  const [durationDraft, setDurationDraft] = useState<string>('permanent');
  const detailQuery = useQuery({
    queryKey: ['ops', 'gymDetail', gymId],
    queryFn: () => fetchOpsGymDetail(gymId),
  });

  // Re-sync the draft to the server's current plan/expiry whenever it
  // changes -- on first load, and again right after a successful apply (so
  // the controls reflect what was actually saved, not what was mid-edit).
  useEffect(() => {
    if (!detailQuery.data) return;
    setPlanDraft(detailQuery.data.gym.plan);
    setDurationDraft('permanent');
  }, [detailQuery.data?.gym.plan, detailQuery.data?.gym.planOverrideExpiresAt]);

  const handleApplyPlan = async () => {
    setIsSavingPlan(true);
    try {
      const months = durationDraft === 'permanent' ? null : Number(durationDraft);
      await updateOpsGymPlan(gymId, planDraft, months);
      await queryClient.invalidateQueries({ queryKey: ['ops', 'gymDetail', gymId] });
      await queryClient.invalidateQueries({ queryKey: ['ops', 'gymList'] });
    } finally {
      setIsSavingPlan(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {detailQuery.isError ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-xs text-slate-500 font-medium">불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => detailQuery.refetch()}
              className="px-4 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-xs cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        ) : detailQuery.isLoading || !detailQuery.data ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-900 mb-1">{detailQuery.data.gym.name}</h2>
            <p className="text-xs text-slate-400 font-mono mb-4">
              /{detailQuery.data.gym.slug} · 가입일 {detailQuery.data.gym.createdAt.slice(0, 10)}
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-slate-500 font-bold">학생 수</p>
                <p className="text-base font-black text-slate-900">{detailQuery.data.gym.studentCount}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-slate-500 font-bold">측정 건수</p>
                <p className="text-base font-black text-slate-900">{detailQuery.data.gym.recordCount}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-slate-500 font-bold">최근 기록일</p>
                <p className="text-xs font-black text-slate-900 mt-1">
                  {detailQuery.data.gym.lastRecordDate ?? '-'}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <label className="text-[11px] font-bold text-amber-800 block mb-1.5">플랜 수동 변경</label>
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={planDraft}
                  disabled={isSavingPlan}
                  onChange={(e) => setPlanDraft(e.target.value as 'free' | 'basic' | 'pro')}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-bold text-slate-800 focus:outline-none disabled:opacity-50"
                >
                  <option value="free">FREE</option>
                  <option value="basic">BASIC</option>
                  <option value="pro">PRO</option>
                </select>
                <select
                  value={durationDraft}
                  disabled={isSavingPlan || planDraft === 'free'}
                  onChange={(e) => setDurationDraft(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-bold text-slate-800 focus:outline-none disabled:opacity-50"
                >
                  {DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleApplyPlan}
                disabled={isSavingPlan}
                className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSavingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>적용</span>
              </button>
              {detailQuery.data.gym.planOverrideExpiresAt && (
                <p className="text-[11px] text-amber-900 font-bold mt-2">
                  ⏰ {detailQuery.data.gym.planOverrideExpiresAt.slice(0, 10)}에 자동으로 FREE로 되돌아가요.
                </p>
              )}
              <p className="text-[10px] text-amber-700 font-medium mt-1.5">
                결제 없이 등급만 직접 바꿔요 (이벤트/체험판 제공, CS 처리 등). 기간을 정하면 그날 자동으로
                FREE로 돌아가고, "기간 없음"이면 다시 바꿀 때까지 유지돼요. 자동 결제 갱신에는 영향 없어요.
              </p>
            </div>

            {detailQuery.data.subscription && (
              <div className="mb-4 text-xs">
                <h3 className="font-bold text-slate-700 mb-1.5">구독 상태</h3>
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-slate-600 font-medium">
                  <div>
                    상태: <span className="font-bold text-slate-900">{detailQuery.data.subscription.status}</span>
                  </div>
                  <div>
                    희망 플랜: {detailQuery.data.subscription.desiredPlan} (
                    {detailQuery.data.subscription.billingCycle === 'yearly' ? '연간' : '월간'})
                  </div>
                  {detailQuery.data.subscription.nextBillingDate && (
                    <div>다음 결제일: {detailQuery.data.subscription.nextBillingDate}</div>
                  )}
                  {detailQuery.data.subscription.cardLast4 && (
                    <div>
                      카드: {detailQuery.data.subscription.cardCompany} **** {detailQuery.data.subscription.cardLast4}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mb-4 text-xs">
              <h3 className="font-bold text-slate-700 mb-1.5">추천 프로그램 (비공개 v2)</h3>
              <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-slate-600 font-medium">
                <div>
                  추천 코드: <span className="font-mono font-bold text-slate-900">{detailQuery.data.gym.referralCode}</span>
                </div>
                <div>누적 추천 성공: {detailQuery.data.gym.referralSuccessCount}명</div>
                <div>보상 반영된 추천 수: {detailQuery.data.gym.referralRewardClaimedCount}명</div>
                <div>누적 지급 개월(24개월 한도): {detailQuery.data.gym.referralRewardMonthsUsed}개월</div>
                <div>
                  인증된 전화번호:{' '}
                  {detailQuery.data.gym.referralVerifiedPhone ? (
                    <span className="font-mono">{detailQuery.data.gym.referralVerifiedPhone}</span>
                  ) : (
                    '미인증'
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-700 mb-1.5">결제 내역</h3>
              {detailQuery.data.payments.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-3 text-center bg-slate-50 rounded-xl">
                  결제 내역 없음
                </p>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {detailQuery.data.payments.map((p) => (
                    <div key={p.id} className="px-3 py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">
                          {p.plan.toUpperCase()} ({p.billingCycle === 'yearly' ? '연간' : '월간'})
                        </div>
                        <div className="text-slate-400 font-mono">{p.paidAt.slice(0, 10)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{p.amount.toLocaleString()}원</div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : p.status === 'canceled'
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-rose-100 text-rose-600'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function OpsDashboardPage() {
  const { session, loading: authLoading } = useAuth();
  const [adminCheck, setAdminCheck] = useState<'checking' | 'allowed' | 'denied' | 'error'>('checking');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  // Bumping this re-runs the admin check below -- the retry button on the
  // network-error screen just increments it.
  const [checkAttempt, setCheckAttempt] = useState(0);

  useEffect(() => {
    if (authLoading || !session) return;
    let cancelled = false;
    setAdminCheck('checking');
    // isPlatformAdmin() itself is timeout-guarded (see data/api/ops.ts), so
    // this always settles one way or another within a bounded time -- no
    // separate race needed here.
    isPlatformAdmin()
      .then((ok) => {
        if (!cancelled) setAdminCheck(ok ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (!cancelled) setAdminCheck('error');
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, session, checkAttempt]);

  const summaryQuery = useQuery({
    queryKey: ['ops', 'summary'],
    queryFn: fetchOpsDashboardSummary,
    enabled: adminCheck === 'allowed',
  });

  const listQuery = useQuery({
    queryKey: ['ops', 'gymList', search, page],
    queryFn: () => fetchOpsGymList(search, PAGE_SIZE, page * PAGE_SIZE),
    enabled: adminCheck === 'allowed',
  });

  // Order matters here: without a session the admin-check effect below
  // never runs (it bails out immediately), so adminCheck stays stuck on
  // 'checking' forever -- checking session first (and redirecting before
  // ever looking at adminCheck) is what actually gets a logged-out visitor
  // to the login page instead of an infinite spinner.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8]">
        <span className="w-8 h-8 border-4 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (adminCheck === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8]">
        <span className="w-8 h-8 border-4 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (adminCheck === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8] p-4">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 shadow-lg text-center">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-black text-slate-900 mb-2">접근 권한이 없어요</h2>
          <p className="text-xs text-slate-500 font-medium">이 페이지는 운영자 계정만 볼 수 있어요.</p>
        </div>
      </div>
    );
  }

  if (adminCheck === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8] p-4">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 shadow-lg text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-black text-slate-900 mb-2">확인 중 문제가 발생했어요</h2>
          <p className="text-xs text-slate-500 font-medium mb-5">
            네트워크 상태를 확인하고 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={() => setCheckAttempt((n) => n + 1)}
            className="px-4 py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-sm cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const s = summaryQuery.data;
  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.total / PAGE_SIZE)) : 1;
  const freeCount = s?.planDistribution.free ?? 0;
  const basicCount = s?.planDistribution.basic ?? 0;
  const proCount = s?.planDistribution.pro ?? 0;
  const paidTotal = basicCount + proCount;
  const conversionRate = s && s.totalGyms > 0 ? ((paidTotal / s.totalGyms) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[#f4f5f8] p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <span className="p-2 rounded-xl bg-slate-900 text-white">
            <ShieldAlert className="w-5 h-5" />
          </span>
          <h1 className="text-xl font-bold text-slate-900">운영자 대시보드</h1>
        </div>

        {summaryQuery.isError ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-xs text-slate-500 font-medium">불러오지 못했어요. 네트워크를 확인해 주세요.</p>
            <button
              type="button"
              onClick={() => summaryQuery.refetch()}
              className="px-4 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-xs cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        ) : summaryQuery.isLoading || !s ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. 가입/활성화 현황 */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-slate-400" />
                가입/활성화 현황 (최근 90일)
              </h2>
              <SignupBarChart data={s.signupsDaily} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                <Tile icon={Users} label="누적 가입 체육관" value={`${s.totalGyms}개`} />
                <Tile
                  icon={AlertTriangle}
                  label="학생 미등록"
                  value={`${s.zeroStudentGyms}개`}
                  sub={s.totalGyms > 0 ? `${((s.zeroStudentGyms / s.totalGyms) * 100).toFixed(0)}%` : undefined}
                />
                <Tile
                  icon={AlertTriangle}
                  label="기록 미입력"
                  value={`${s.zeroRecordGyms}개`}
                  sub={s.totalGyms > 0 ? `${((s.zeroRecordGyms / s.totalGyms) * 100).toFixed(0)}%` : undefined}
                />
              </div>

              {s.inactiveGyms.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-slate-600 mb-2">
                    온보딩 실패/이탈 후보 (가입 3일+ 경과, 최근 14일 무기록)
                  </h3>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {s.inactiveGyms.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGymId(g.id)}
                        className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 cursor-pointer text-left"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{g.name}</span>
                          <span className="text-slate-400 font-mono ml-2">{g.createdAt.slice(0, 10)} 가입</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span>학생 {g.studentCount}명</span>
                          <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100">{PLAN_LABEL[g.plan]}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 2. 매출/결제 현황 */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-slate-400" />
                매출/결제 현황
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Tile icon={TrendingUp} label="이번달 매출" value={`${s.revenueThisMonth.toLocaleString()}원`} />
                <Tile icon={TrendingUp} label="MRR 추정치" value={`${Math.round(s.mrrEstimate).toLocaleString()}원`} />
                <Tile
                  icon={Users}
                  label="유료 전환 (누적)"
                  value={`${s.basicConversions + s.proConversions}개`}
                  sub={`BASIC ${s.basicConversions} · PRO ${s.proConversions}`}
                />
                <Tile
                  icon={AlertTriangle}
                  label="구독 해지"
                  value={`${s.canceledSubscriptions}건`}
                  sub={`활성 구독 ${s.activeSubscriptions}건`}
                />
              </div>

              {s.failedPayments.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-slate-600 mb-2">결제 실패 목록 (재결제 유도 대상)</h3>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {s.failedPayments.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedGymId(p.gymId)}
                        className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 cursor-pointer text-left"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{p.gymName}</span>
                          <span className="text-slate-400 ml-2">{p.plan.toUpperCase()}</span>
                        </div>
                        <div className="text-right text-slate-500">
                          <div>{p.amount.toLocaleString()}원</div>
                          <div className="text-rose-500 font-medium">{p.failureReason ?? '실패'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 3. 플랜 분포 */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                플랜 분포
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <Tile icon={Users} label="FREE" value={`${freeCount}개`} />
                <Tile icon={Users} label="BASIC" value={`${basicCount}개`} />
                <Tile icon={Users} label="PRO" value={`${proCount}개`} />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                무료→유료 전환율: <span className="font-bold text-slate-900">{conversionRate}%</span>
              </p>
            </section>

            {/* 5. 추천 프로그램 */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-slate-400" />
                추천 프로그램
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Tile icon={Gift} label="추천으로 가입" value={`${s.referralTotal}개`} />
                <Tile icon={Gift} label="보상 지급 완료" value={`${s.referralRewarded}개`} />
              </div>
            </section>

            {/* 4. 체육관 목록 */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-slate-400" />
                  체육관 목록 {listQuery.data && `(총 ${listQuery.data.total}개)`}
                </h2>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder="이름/주소 검색..."
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              {listQuery.isError ? (
                <div className="py-8 flex flex-col items-center gap-2">
                  <p className="text-xs text-slate-500 font-medium">불러오지 못했어요.</p>
                  <button
                    type="button"
                    onClick={() => listQuery.refetch()}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    다시 시도
                  </button>
                </div>
              ) : listQuery.isLoading || !listQuery.data ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse min-w-[560px]">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                        <tr>
                          <th className="p-2.5 pl-3">이름</th>
                          <th className="p-2.5">가입일</th>
                          <th className="p-2.5">플랜</th>
                          <th className="p-2.5 text-right">학생수</th>
                          <th className="p-2.5 text-right">기록건수</th>
                          <th className="p-2.5 pr-3">최근 기록일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {listQuery.data.items.map((g: OpsGymListItem) => (
                          <tr
                            key={g.id}
                            onClick={() => setSelectedGymId(g.id)}
                            className="hover:bg-slate-50 cursor-pointer"
                          >
                            <td className="p-2.5 pl-3 font-bold">{g.name}</td>
                            <td className="p-2.5 font-mono text-slate-500">{g.createdAt.slice(0, 10)}</td>
                            <td className="p-2.5">
                              <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100">
                                {PLAN_LABEL[g.plan]}
                              </span>
                            </td>
                            <td className="p-2.5 text-right">{g.studentCount}</td>
                            <td className="p-2.5 text-right">{g.recordCount}</td>
                            <td className="p-2.5 pr-3 font-mono text-slate-500">{g.lastRecordDate ?? '-'}</td>
                          </tr>
                        ))}
                        {listQuery.data.items.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                              검색 결과가 없어요.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-3 text-xs font-bold">
                      <button
                        type="button"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        이전
                      </button>
                      <span className="text-slate-500">
                        {page + 1} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>

      {selectedGymId && <GymDetailPanel gymId={selectedGymId} onClose={() => setSelectedGymId(null)} />}
    </div>
  );
}
