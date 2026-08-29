import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Route-level code splitting -- each page only downloads once actually
// visited, so e.g. a parent opening the public TV board never pulls in
// AdminAppPage's recharts/xlsx/jspdf/html2canvas dependencies.
const SignUpPage = lazy(() => import('./routes/SignUpPage'));
const LoginPage = lazy(() => import('./routes/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./routes/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./routes/ResetPasswordPage'));
const LandingPage = lazy(() => import('./routes/LandingPage'));
const AdminAppPage = lazy(() => import('./routes/AdminAppPage'));
const PublicBoardPage = lazy(() => import('./routes/PublicBoardPage'));
const PublicTvPage = lazy(() => import('./routes/PublicTvPage'));
const PublicGlobalRankingPage = lazy(() => import('./routes/PublicGlobalRankingPage'));
const PrivacyPolicyPage = lazy(() => import('./routes/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./routes/TermsOfServicePage'));

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
