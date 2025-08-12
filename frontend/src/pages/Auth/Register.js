import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    station: '',
    employee_id: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await authService.register(formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-green-50 border border-green-200 rounded-md p-6 text-center">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Registration Successful!</h2>
          <p className="text-green-700 mb-4">
            Please check your email to verify your account before logging in.
          </p>
          <p className="text-sm text-green-600">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center bg-frnsw-red rounded-full">
            <span className="text-white text-2xl">🚒</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join FRNSW Recalls 90
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  name="first_name"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-frnsw-red focus:border-frnsw-red sm:text-sm"
                  placeholder="First Name"
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <input
                  name="last_name"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-frnsw-red focus:border-frnsw-red sm:text-sm"
                  placeholder="Last Name"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <input
                name="email"
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-frnsw-red focus:border-frnsw-red sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <input
                name="phone"
                type="tel"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-frnsw-red focus:border-frnsw-red sm:text-sm"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  name="station"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-frnsw-red focus:border-frnsw-red sm:text-sm"
                  placeholder="Station"
                  value={formData.station}
                  onChange={handleChange}
                />
              </div>
              <div>
                <input
                  name="employee_id"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-frnsw-red focus:border-frnsw-red sm:text-sm"
                  placeholder="Employee ID"
                  value={formData.employee_id}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <input
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-frnsw-red focus:border-frnsw-red sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <input
                name="confirm_password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-frnsw-red focus:border-frnsw-red sm:text-sm"
                placeholder="Confirm Password"
                value={formData.confirm_password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-frnsw-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-frnsw-red disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-frnsw-red hover:text-red-700">
                Sign in here
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
