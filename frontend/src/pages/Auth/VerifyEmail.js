import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setError('Invalid verification link');
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err.message || 'Email verification failed');
      }
    };

    verifyEmail();
  }, [token]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-green-50 border border-green-200 rounded-md p-6 text-center">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Email Verified!</h2>
          <p className="text-green-700 mb-6">
            Your email has been successfully verified. You can now log in to your account.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-frnsw-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-frnsw-red"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-md p-6 text-center">
        <div className="text-red-600 text-4xl mb-4">✗</div>
        <h2 className="text-xl font-semibold text-red-800 mb-2">Verification Failed</h2>
        <p className="text-red-700 mb-6">{error}</p>
        <div className="space-y-3">
          <Link
            to="/login"
            className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-frnsw-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-frnsw-red"
          >
            Back to Login
          </Link>
          <Link
            to="/register"
            className="block w-full text-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-frnsw-red"
          >
            Register Again
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
