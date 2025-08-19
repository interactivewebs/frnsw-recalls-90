import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ChangePassword = () => {
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    setLoading(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Redirect to dashboard after successful change
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center bg-frnsw-red rounded-full">
            <span className="text-white text-2xl">🔐</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Change Password</h2>
          <p className="mt-2 text-center text-sm text-gray-600">For security, please update your password.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
          )}
          <div className="space-y-4">
            <input name="currentPassword" type="password" required className="appearance-none rounded-md w-full px-3 py-2 border border-gray-300 sm:text-sm" placeholder="Current password" value={form.currentPassword} onChange={onChange} />
            <input name="newPassword" type="password" required className="appearance-none rounded-md w-full px-3 py-2 border border-gray-300 sm:text-sm" placeholder="New password (8+ chars, upper/lower/number)" value={form.newPassword} onChange={onChange} />
            <input name="confirmPassword" type="password" required className="appearance-none rounded-md w-full px-3 py-2 border border-gray-300 sm:text-sm" placeholder="Confirm new password" value={form.confirmPassword} onChange={onChange} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2 px-4 rounded-md text-white bg-frnsw-red hover:bg-red-700 disabled:opacity-50">{loading ? 'Saving...' : 'Update Password'}</button>
          <div className="text-center text-sm mt-2">
            <Link to="/" className="text-frnsw-red hover:text-red-700">Back to Dashboard</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;


