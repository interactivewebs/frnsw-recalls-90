import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useSocket } from './contexts/SocketContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AdminRoute from './components/Auth/AdminRoute';
import LoadingSpinner from './components/UI/LoadingSpinner';
import OfflineIndicator from './components/UI/OfflineIndicator';
import InstallPrompt from './components/UI/InstallPrompt';

// Lazy load components for better performance
const Login = React.lazy(() => import('./pages/Auth/Login'));
const Register = React.lazy(() => import('./pages/Auth/Register'));
const VerifyEmail = React.lazy(() => import('./pages/Auth/VerifyEmail'));
const ResetPassword = React.lazy(() => import('./pages/Auth/ResetPassword'));
const ChangePassword = React.lazy(() => import('./pages/Auth/ChangePassword'));
const Dashboard = React.lazy(() => import('./pages/Dashboard/Dashboard'));
const Recalls = React.lazy(() => import('./pages/Recalls/Recalls'));
const RecallDetail = React.lazy(() => import('./pages/Recalls/RecallDetail'));
const PastBids = React.lazy(() => import('./pages/Recalls/PastBids'));
const Calendar = React.lazy(() => import('./pages/Calendar/Calendar'));
const Reports = React.lazy(() => import('./pages/Reports/Reports'));
const Profile = React.lazy(() => import('./pages/Profile/Profile'));
const AdminPanel = React.lazy(() => import('./pages/Admin/AdminPanel'));
const NotFound = React.lazy(() => import('./pages/Error/NotFound'));

function App() {
  const { user, loading, checkAuthStatus } = useAuth();
  const { connect, disconnect } = useSocket();

  useEffect(() => {
    // Check authentication status on app load
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    // Connect to socket when user is authenticated
    if (user) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <div className="App min-h-screen bg-gray-50">
        <OfflineIndicator />
        <InstallPrompt />
        
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" replace /> : (
                <Suspense fallback={<LoadingSpinner />}>
                  <Login />
                </Suspense>
              )
            }
          />
          <Route
            path="/register"
            element={
              user ? <Navigate to="/" replace /> : (
                <Suspense fallback={<LoadingSpinner />}>
                  <Register />
                </Suspense>
              )
            }
          />
          <Route
            path="/verify-email"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <VerifyEmail />
              </Suspense>
            }
          />
          <Route
            path="/reset-password"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <ResetPassword />
              </Suspense>
            }
          />
          <Route
            path="/change-password"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <ChangePassword />
              </Suspense>
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Dashboard />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/recalls"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Recalls />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/recalls/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <RecallDetail />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/past-bids"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <PastBids />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Calendar />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Reports />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Profile />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <Layout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <AdminPanel />
                    </Suspense>
                  </Layout>
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          {/* Legacy path redirect: /dashboard -> / */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* 404 route */}
          <Route
            path="*"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <NotFound />
              </Suspense>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;