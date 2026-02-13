import React from 'react';
import packageJson from '../../../package.json';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const appVersion = (process.env.REACT_APP_VERSION || packageJson.version || '1.0').toString();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || (path === '/' && location.pathname === '/dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-frnsw-red text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded text-frnsw-red flex items-center justify-center font-bold">
                  
                </div>
                <span className="font-bold text-lg">FRNSW Recalls 90</span>
              </Link>
            </div>

            <nav className="hidden md:flex space-x-6">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/')
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
              <Link
                to="/past-bids"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/past-bids')
                    ? 'bg-red-700 text-white'
                    : 'text-red-100 hover:bg-red-700 hover:text-white'
                }`}
              >
                Past Bids
              </Link>
              {user?.is_admin && (
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

            <div className="relative">
              <details className="group">
                <summary className="flex items-center space-x-2 cursor-pointer list-none text-red-100 hover:text-white transition-colors">
                  <span>{user?.first_name} {user?.last_name}</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
                </summary>
                <div className="absolute right-0 mt-2 w-48 bg-white text-gray-700 rounded shadow-lg py-2 z-10">
                  <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">Account</Link>
                  <Link to="/change-password" className="block px-4 py-2 hover:bg-gray-100">Reset Password</Link>
                  <button onClick={handleLogout} className="w-full text-left block px-4 py-2 hover:bg-gray-100">Logout</button>
                </div>
              </details>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="bg-gray-100 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-sm text-gray-500 flex justify-between">
          <span>© {new Date().getFullYear()} FRNSW Recalls 90</span>
          <span>Version {appVersion.startsWith('v') ? appVersion.substring(1) : appVersion}</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
