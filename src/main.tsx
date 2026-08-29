import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import {AuthProvider} from './contexts/AuthContext';
import './index.css';

// No-op with no DSN configured, so local/dev builds don't need a Sentry
// account -- only set VITE_SENTRY_DSN in prod (Vercel env vars) to enable.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, environment: import.meta.env.MODE });
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
            <h1 className="text-sm font-bold text-slate-900 mb-2">문제가 발생했어요</h1>
            <p className="text-xs text-slate-500 font-medium mb-4">
              예상치 못한 오류가 발생했습니다. 새로고침해서 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-xs transition-all cursor-pointer"
            >
              새로고침
            </button>
          </div>
        </div>
      }
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
        {/* No-op off Vercel (e.g. local dev) -- only actually sends beacons
            when served from a Vercel deployment. */}
        <Analytics />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
