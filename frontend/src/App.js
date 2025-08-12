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
const Dashboard = React.lazy(() => import('./pages/Dashboard/Dashboard'));
const Recalls = React.lazy(() => import('./pages/Recalls/Recalls'));
const RecallDetail = React.lazy(() => import('./pages/Recalls/RecallDetail'));
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

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route
              index
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Dashboard />
                </Suspense>
              }
            />

            {/* Recalls */}
            <Route
              path="recalls"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Recalls />
                </Suspense>
              }
            />
            <Route
              path="recalls/:id"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <RecallDetail />
                </Suspense>
              }
            />

            {/* Calendar */}
            <Route
              path="calendar"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Calendar />
                </Suspense>
              }
            />

            {/* Reports */}
            <Route
              path="reports"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Reports />
                </Suspense>
              }
            />

            {/* Profile */}
            <Route
              path="profile"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Profile />
                </Suspense>
              }
            />

            {/* Admin routes */}
            <Route
              path="admin/*"
              element={
                <AdminRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminPanel />
                  </Suspense>
                </AdminRoute>
              }
            />
          </Route>

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