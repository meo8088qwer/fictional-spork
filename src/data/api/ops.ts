import { supabase } from '../../lib/supabaseClient';

// Platform-operator-only reads/writes -- every RPC here re-checks
// is_platform_admin() server-side (see 0019_ops_dashboard.sql), so a
// non-admin calling these directly gets a FORBIDDEN error no matter what
// this file does. isPlatformAdmin() below is just the UI-layer guard that
// decides whether to render the page at all.

// Some mobile carriers/proxies leave a stalled request open instead of
// erroring it, so a plain await can hang forever with no way for the UI to
// ever leave its loading state. Race every call here against a timeout so
// each one always settles one way or another.
function withTimeout<T>(promise: PromiseLike<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('요청 시간이 초과됐어요. 다시 시도해 주세요.')), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await withTimeout(supabase.rpc('is_platform_admin'));
  if (error) return false;
  return !!data;
}

export interface OpsDailyCount {
  date: string;
  count: number;
}

export interface OpsInactiveGym {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'basic' | 'pro';
  createdAt: string;
  studentCount: number;
  lastRecordDate: string | null;
}

export interface OpsFailedPayment {
  gymId: string;
  gymName: string;
  plan: string;
  amount: number;
  failureReason: string | null;
  paidAt: string;
}

export interface OpsDashboardSummary {
  signupsDaily: OpsDailyCount[];
  totalGyms: number;
  zeroStudentGyms: number;
  zeroRecordGyms: number;
  inactiveGyms: OpsInactiveGym[];
  planDistribution: Record<string, number>;
  revenueThisMonth: number;
  mrrEstimate: number;
  basicConversions: number;
  proConversions: number;
  failedPayments: OpsFailedPayment[];
  activeSubscriptions: number;
  canceledSubscriptions: number;
  referralTotal: number;
  referralRewarded: number;
}

function mapInactiveGym(row: any): OpsInactiveGym {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    createdAt: row.created_at,
    studentCount: row.student_count,
    lastRecordDate: row.last_record_date,
  };
}

export async function fetchOpsDashboardSummary(): Promise<OpsDashboardSummary> {
  const { data, error } = await withTimeout(supabase.rpc('ops_dashboard_summary'));
  if (error) throw error;
  return {
    signupsDaily: (data.signups_daily ?? []).map((r: any) => ({ date: r.date, count: r.count })),
    totalGyms: data.total_gyms,
    zeroStudentGyms: data.zero_student_gyms,
    zeroRecordGyms: data.zero_record_gyms,
    inactiveGyms: (data.inactive_gyms ?? []).map(mapInactiveGym),
    planDistribution: data.plan_distribution ?? {},
    revenueThisMonth: data.revenue_this_month,
    mrrEstimate: Number(data.mrr_estimate) || 0,
    basicConversions: data.basic_conversions,
    proConversions: data.pro_conversions,
    failedPayments: (data.failed_payments ?? []).map((p: any) => ({
      gymId: p.gym_id,
      gymName: p.gym_name,
      plan: p.plan,
      amount: p.amount,
      failureReason: p.failure_reason,
      paidAt: p.paid_at,
    })),
    activeSubscriptions: data.active_subscriptions,
    canceledSubscriptions: data.canceled_subscriptions,
    referralTotal: data.referral_total,
    referralRewarded: data.referral_rewarded,
  };
}

export interface OpsGymListItem {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'basic' | 'pro';
  createdAt: string;
  studentCount: number;
  recordCount: number;
  lastRecordDate: string | null;
}

export interface OpsGymListResult {
  total: number;
  items: OpsGymListItem[];
}

export async function fetchOpsGymList(search: string, limit: number, offset: number): Promise<OpsGymListResult> {
  const { data, error } = await withTimeout(
    supabase.rpc('ops_list_gyms', {
      p_search: search || null,
      p_limit: limit,
      p_offset: offset,
    })
  );
  if (error) throw error;
  return {
    total: data.total,
    items: (data.items ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      plan: g.plan,
      createdAt: g.created_at,
      studentCount: g.student_count,
      recordCount: g.record_count,
      lastRecordDate: g.last_record_date,
    })),
  };
}

export interface OpsGymDetail {
  gym: OpsGymListItem & { referredByGymId: string | null; planOverrideExpiresAt: string | null };
  subscription: {
    status: string;
    desiredPlan: string;
    billingCycle: string;
    nextBillingDate: string | null;
    cardLast4: string | null;
    cardCompany: string | null;
  } | null;
  payments: {
    id: string;
    plan: string;
    billingCycle: string;
    amount: number;
    status: string;
    failureReason: string | null;
    paidAt: string;
  }[];
}

export async function fetchOpsGymDetail(gymId: string): Promise<OpsGymDetail> {
  const { data, error } = await withTimeout(supabase.rpc('ops_gym_detail', { p_gym_id: gymId }));
  if (error) throw error;
  const g = data.gym;
  const sub = data.subscription;
  return {
    gym: {
      id: g.id,
      name: g.name,
      slug: g.slug,
      plan: g.plan,
      createdAt: g.created_at,
      studentCount: g.student_count,
      recordCount: g.record_count,
      lastRecordDate: g.last_record_date,
      referredByGymId: g.referred_by_gym_id,
      planOverrideExpiresAt: g.plan_override_expires_at,
    },
    subscription: sub
      ? {
          status: sub.status,
          desiredPlan: sub.desired_plan,
          billingCycle: sub.billing_cycle,
          nextBillingDate: sub.next_billing_date,
          cardLast4: sub.card_last4,
          cardCompany: sub.card_company,
        }
      : null,
    payments: (data.payments ?? []).map((p: any) => ({
      id: p.id,
      plan: p.plan,
      billingCycle: p.billing_cycle,
      amount: p.amount,
      status: p.status,
      failureReason: p.failure_reason,
      paidAt: p.paid_at,
    })),
  };
}

export async function updateOpsGymPlan(
  gymId: string,
  plan: 'free' | 'basic' | 'pro',
  durationMonths: number | null = null
): Promise<void> {
  const { error } = await withTimeout(
    supabase.rpc('ops_update_gym_plan', { p_gym_id: gymId, p_plan: plan, p_duration_months: durationMonths })
  );
  if (error) throw error;
}
