// Thin wrapper around Toss Payments' script-tag SDK (no npm package needed
// for the one method we use). Loads https://js.tosspayments.com/v1/payment
// once and exposes requestBillingAuth, which redirects the whole page to
// Toss's hosted card-registration UI and back to successUrl/failUrl.

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestBillingAuth: (
        method: '카드',
        params: { customerKey: string; successUrl: string; failUrl: string }
      ) => Promise<void>;
    };
  }
}

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined;

let scriptPromise: Promise<void> | null = null;

function loadTossScript(): Promise<void> {
  if (window.TossPayments) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// Kicks off card registration -- the browser navigates away to Toss and
// back, so this never resolves normally on success; the result arrives as
// query params on successPath/failPath instead.
export async function requestCardRegistration(
  customerKey: string,
  successPath: string,
  failPath: string
): Promise<void> {
  if (!TOSS_CLIENT_KEY) {
    throw new Error('결제 모듈이 아직 설정되지 않았습니다. (VITE_TOSS_CLIENT_KEY 누락)');
  }
  await loadTossScript();
  const tossPayments = window.TossPayments!(TOSS_CLIENT_KEY);
  await tossPayments.requestBillingAuth('카드', {
    customerKey,
    successUrl: `${window.location.origin}${successPath}`,
    failUrl: `${window.location.origin}${failPath}`,
  });
}
