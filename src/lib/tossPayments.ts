// Thin wrapper around Toss Payments' v2 script-tag SDK (no npm package
// needed for the one flow we use). Loads https://js.tosspayments.com/v2/standard
// once, creates a payment instance for the customer, and calls
// requestBillingAuth, which redirects the whole page to Toss's hosted
// card-registration UI and back to successUrl/failUrl.

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (params: { customerKey: string }) => {
        requestBillingAuth: (params: {
          method: 'CARD';
          successUrl: string;
          failUrl: string;
          customerEmail?: string;
          customerName?: string;
        }) => Promise<void>;
        requestPayment: (params: {
          method: 'CARD';
          amount: { currency: 'KRW'; value: number };
          orderId: string;
          orderName: string;
          successUrl: string;
          failUrl: string;
          customerEmail?: string;
          customerName?: string;
        }) => Promise<void>;
      };
    };
  }
}

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined;

// ponytail: temporary export so PricingPage can show which client key is
// actually baked into this build -- delete once the key-mismatch issue is
// confirmed fixed.
export function getTossClientKeyDebugInfo(): string {
  if (!TOSS_CLIENT_KEY) return '(설정 안 됨)';
  return `${TOSS_CLIENT_KEY.slice(0, 14)}...${TOSS_CLIENT_KEY.slice(-4)} (길이 ${TOSS_CLIENT_KEY.length})`;
}

let scriptPromise: Promise<void> | null = null;

function loadTossScript(): Promise<void> {
  if (window.TossPayments) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v2/standard';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// Kicks off card registration -- the browser navigates away to Toss and
// back, so this never resolves normally on success; the result arrives as
// query params on successPath (customerKey, authKey) or failPath
// (code, message) instead.
export async function requestCardRegistration(
  customerKey: string,
  successPath: string,
  failPath: string,
  customerEmail?: string,
  customerName?: string
): Promise<void> {
  if (!TOSS_CLIENT_KEY) {
    throw new Error('결제 모듈이 아직 설정되지 않았습니다. (VITE_TOSS_CLIENT_KEY 누락)');
  }
  await loadTossScript();
  const tossPayments = window.TossPayments!(TOSS_CLIENT_KEY);
  const payment = tossPayments.payment({ customerKey });
  try {
    await payment.requestBillingAuth({
      method: 'CARD',
      successUrl: `${window.location.origin}${successPath}`,
      failUrl: `${window.location.origin}${failPath}`,
      customerEmail,
      customerName,
    });
  } catch (err) {
    // Toss's SDK often rejects with a plain { code, message } object
    // instead of an Error instance, so err.message can be undefined --
    // normalize so callers always get a usable string.
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
    throw new Error(message || '결제 모듈 호출 중 오류가 발생했습니다.');
  }
}

// Interim payment flow while this gym's Toss account doesn't have
// 자동결제(빌링) contract approval yet: a regular one-time card payment
// (no contract required) instead of requestCardRegistration's billing-key
// registration above. Doesn't auto-renew -- see billing-charge/index.ts's
// expiry check. Swap back to requestCardRegistration once approved.
export async function requestOneTimePayment(
  customerKey: string,
  orderId: string,
  orderName: string,
  amount: number,
  successPath: string,
  failPath: string,
  customerEmail?: string,
  customerName?: string
): Promise<void> {
  if (!TOSS_CLIENT_KEY) {
    throw new Error('결제 모듈이 아직 설정되지 않았습니다. (VITE_TOSS_CLIENT_KEY 누락)');
  }
  await loadTossScript();
  const tossPayments = window.TossPayments!(TOSS_CLIENT_KEY);
  const payment = tossPayments.payment({ customerKey });
  try {
    await payment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: amount },
      orderId,
      orderName,
      successUrl: `${window.location.origin}${successPath}`,
      failUrl: `${window.location.origin}${failPath}`,
      customerEmail,
      customerName,
    });
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
    throw new Error(message || '결제 모듈 호출 중 오류가 발생했습니다.');
  }
}
