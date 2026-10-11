/**
 * src/App.jsx
 * Enterprise React Router configuration with Left Sidebar Layout.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PortalLayout } from './components/PortalLayout';

import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { TranslationPage } from './pages/TranslationPage';
import { CompliancePage } from './pages/CompliancePage';
import { RiskAnalysisPage } from './pages/RiskAnalysisPage';
import { DeadlinesPage } from './pages/DeadlinesPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReportPage } from './pages/ReportPage';
import { SettingsPage } from './pages/SettingsPage';

const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Page (Full screen, no sidebar) */}
          <Route path="/login" element={<AuthPage />} />

          {/* Protected Enterprise Routes with Left Sidebar Layout */}
          <Route
            element={
              <ProtectedRoute>
                <PortalLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/translation" element={<TranslationPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/risk-analysis" element={<RiskAnalysisPage />} />
            <Route path="/deadlines" element={<DeadlinesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/report/:id" element={<ReportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback & Root redirects */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
