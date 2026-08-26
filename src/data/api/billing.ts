import { supabase } from '../../lib/supabaseClient';

// Supabase's PostgrestError is a plain object, not an Error instance --
// `throw error` on one silently breaks any `catch (err) { err instanceof
// Error ? err.message : '...' }` upstream (exactly what masked the real
// "카드 등록을 시작하지 못했어요" cause). Always throw a real Error instead.
function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error(String(error));
}

export interface Subscription {
  gymId: string;
  customerKey: string;
  desiredPlan: 'basic' | 'pro';
  status: 'none' | 'active' | 'past_due' | 'canceled';
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string | null;
  cardLast4: string | null;
  cardCompany: string | null;
  failedAttempts: number;
}

function mapSubscriptionRow(row: any): Subscription {
  return {
    gymId: row.gym_id,
    customerKey: row.customer_key,
    desiredPlan: row.desired_plan,
    status: row.status,
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
    cardLast4: row.card_last4,
    cardCompany: row.card_company,
    failedAttempts: row.failed_attempts,
  };
}

// Idempotent: creates the gym's subscription placeholder row (status
// 'none') on first call, just returns it on every call after. Needed
// before card registration since Toss requires a customerKey up front.
export async function ensureSubscription(): Promise<Subscription> {
  const { data, error } = await supabase.rpc('ensure_gym_subscription');
  if (error) throw toError(error);
  return mapSubscriptionRow(data);
}

export async function getMySubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase.from('my_subscription').select('*').maybeSingle();
  if (error) throw toError(error);
  return data ? mapSubscriptionRow(data) : null;
}

export interface ActivateBillingParams {
  authKey: string;
  customerKey: string;
  plan: 'basic' | 'pro';
  billingCycle: 'monthly' | 'yearly';
}

// Calls the billing-issue Edge Function, which exchanges authKey for a
// billingKey with Toss (server-side, using the secret key) and activates
// the subscription. Throws with a user-facing message on failure.
export async function activateBilling(params: ActivateBillingParams): Promise<void> {
  const { error } = await supabase.functions.invoke('billing-issue', { body: params });
  if (error) {
    // FunctionsHttpError wraps the raw Response in `.context` -- surface
    // our own { error: string } body instead of supabase-js's generic
    // "non-2xx status code" message when we can.
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = await context.json();
        if (body?.error) throw new Error(body.error);
      } catch {
        // fall through to the generic error below
      }
    }
    throw toError(error);
  }
}
