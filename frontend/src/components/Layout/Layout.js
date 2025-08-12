import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-frnsw-red text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded text-frnsw-red flex items-center justify-center font-bold">
                  ��
                </div>
                <span className="font-bold text-lg">FRNSW Recalls 90</span>
              </Link>
            </div>

            <nav className="hidden md:flex space-x-6">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-red-700 text-white'
                    : 'text-red-100 hover:bg-red-700 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/recalls"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/recalls')
                    ? 'bg-red-700 text-white'
                    : 'text-red-100 hover:bg-red-700 hover:text-white'
                }`}
              >
                Recalls
              </Link>
              <Link
                to="/calendar"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/calendar')
                    ? 'bg-red-700 text-white'
                    : 'text-red-100 hover:bg-red-700 hover:text-white'
                }`}
              >
                Calendar
              </Link>
              <Link
                to="/reports"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/reports')
                    ? 'bg-red-700 text-white'
                    : 'text-red-100 hover:bg-red-700 hover:text-white'
                }`}
              >
                Reports
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/admin')
                      ? 'bg-red-700 text-white'
                      : 'text-red-100 hover:bg-red-700 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              <Link
                to="/profile"
                className="text-red-100 hover:text-white transition-colors"
              >
                {user?.first_name} {user?.last_name}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-700 hover:bg-red-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
