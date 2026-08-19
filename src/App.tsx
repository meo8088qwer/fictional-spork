import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import SignUpPage from './routes/SignUpPage';
import LoginPage from './routes/LoginPage';
import LandingPage from './routes/LandingPage';
import AdminAppPage from './routes/AdminAppPage';
import PublicBoardPage from './routes/PublicBoardPage';
import PublicTvPage from './routes/PublicTvPage';

function RootRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/admin" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/about" element={<LandingPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/g/:slug" element={<PublicBoardPage />} />
      <Route path="/g/:slug/tv" element={<PublicTvPage />} />
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
  );
}
