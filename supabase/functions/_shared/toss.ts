// Minimal Toss Payments billing (빌링) API client. Two calls only:
// issue a billingKey from a card-registration authKey, and charge an
// existing billingKey. Both need TOSS_SECRET_KEY, which must only ever
// live in Supabase Edge Function secrets -- never in frontend code.
//
// ponytail: field names for the card info in issueBillingKey's response
// (card.number / card.company) are from training-time knowledge of the
// Toss Billing API and haven't been verified against a live test key yet
// (no network access to docs.tosspayments.com in this sandbox). Verify
// against a real response once test keys are available -- worst case the
// card brand/last4 display is blank, it doesn't break the charge itself.

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

function authHeader(secretKey: string): string {
  return `Basic ${btoa(`${secretKey}:`)}`;
}

export interface TossBillingAuth {
  billingKey: string;
  card?: { number?: string; company?: string; issuerCode?: string };
}

export async function issueBillingKey(
  secretKey: string,
  authKey: string,
  customerKey: string
): Promise<TossBillingAuth> {
  const res = await fetch(`${TOSS_API_BASE}/billing/authorizations/issue`, {
    method: 'POST',
    headers: { Authorization: authHeader(secretKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ authKey, customerKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '카드 등록에 실패했습니다.');
  return data;
}

export interface TossChargeResult {
  paymentKey: string;
  status: string;
  totalAmount: number;
}

export interface ChargeParams {
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
}

export async function chargeBillingKey(
  secretKey: string,
  billingKey: string,
  params: ChargeParams
): Promise<TossChargeResult> {
  const res = await fetch(`${TOSS_API_BASE}/billing/${billingKey}`, {
    method: 'POST',
    headers: { Authorization: authHeader(secretKey), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '결제에 실패했습니다.');
  return data;
}

export const PLAN_PRICE: Record<'basic' | 'pro', Record<'monthly' | 'yearly', number>> = {
  basic: { monthly: 4900, yearly: 49000 },
  pro: { monthly: 9900, yearly: 99000 },
};
