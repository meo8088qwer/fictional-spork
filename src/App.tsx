import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';

// A page left open across a deploy (or one served from a stale HTML cache)
// requests a route chunk by its old content hash, which 404s once the new
// build's dist/assets no longer has that file -- the 404 comes back as
// text/html, so the browser throws "'text/html' is not a valid JavaScript
// MIME type" or "Failed to fetch dynamically imported module" instead of a
// normal network error. That's almost always fixed by just reloading (the
// fresh index.html points at the current chunk hashes), so retry once via
// a hard reload before giving up to the error boundary. sessionStorage
// (not a module-level flag) survives the reload itself, so this can't loop.
function lazyWithReloadOnChunkError<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) {
  return lazy(() =>
    factory().catch((err) => {
      const key = 'chunk-reload-attempted';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise<T>(() => {}); // reload is already in flight; never resolve
      }
      throw err;
    })
  );
}

// Route-level code splitting -- each page only downloads once actually
// visited, so e.g. a parent opening the public TV board never pulls in
// AdminAppPage's recharts/xlsx/jspdf/html2canvas dependencies.
const SignUpPage = lazyWithReloadOnChunkError(() => import('./routes/SignUpPage'));
const LoginPage = lazyWithReloadOnChunkError(() => import('./routes/LoginPage'));
const ForgotPasswordPage = lazyWithReloadOnChunkError(() => import('./routes/ForgotPasswordPage'));
const ResetPasswordPage = lazyWithReloadOnChunkError(() => import('./routes/ResetPasswordPage'));
const LandingPage = lazyWithReloadOnChunkError(() => import('./routes/LandingPage'));
const AdminAppPage = lazyWithReloadOnChunkError(() => import('./routes/AdminAppPage'));
const PublicBoardPage = lazyWithReloadOnChunkError(() => import('./routes/PublicBoardPage'));
const PublicTvPage = lazyWithReloadOnChunkError(() => import('./routes/PublicTvPage'));
const PublicGlobalRankingPage = lazyWithReloadOnChunkError(() => import('./routes/PublicGlobalRankingPage'));
const PrivacyPolicyPage = lazyWithReloadOnChunkError(() => import('./routes/PrivacyPolicyPage'));
const TermsOfServicePage = lazyWithReloadOnChunkError(() => import('./routes/TermsOfServicePage'));
const OpsDashboardPage = lazyWithReloadOnChunkError(() => import('./routes/OpsDashboardPage'));

function RootRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/admin" replace />;
  return <LandingPage />;
}

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8]">
      <span className="w-8 h-8 border-4 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/g/:slug" element={<PublicBoardPage />} />
        <Route path="/g/:slug/tv" element={<PublicTvPage />} />
        <Route path="/g/:slug/global-ranking" element={<PublicGlobalRankingPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminAppPage />
            </ProtectedRoute>
          }
        />
        <Route path="/ops" element={<OpsDashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
