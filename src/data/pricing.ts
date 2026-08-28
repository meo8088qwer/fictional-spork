// Shared with PricingPage's TIERS (which carries the fuller marketing copy)
// and MyPage's re-payment flow -- kept here so both read the same numbers
// instead of drifting apart. The Edge Functions (billing-issue,
// billing-charge) must stay self-contained single files for Supabase's
// browser editor, so they keep their own copy of this table; if the price
// ever changes, update those too.
export type PlanKey = 'basic' | 'pro';
export type BillingCycle = 'monthly' | 'yearly';

export const PLAN_MONTHLY_PRICE: Record<PlanKey, number> = {
  basic: 4900,
  pro: 9900,
};

// 2 months free on yearly = pay for 10 months -> ~17% off.
export const yearlyPrice = (monthlyPrice: number) => monthlyPrice * 10;

export function planAmount(plan: PlanKey, cycle: BillingCycle): number {
  const monthly = PLAN_MONTHLY_PRICE[plan];
  return cycle === 'yearly' ? yearlyPrice(monthly) : monthly;
}
