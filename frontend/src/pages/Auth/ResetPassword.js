import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ResetPassword = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <h1 className="text-center text-2xl font-bold">Reset Password</h1>
        <p className="text-center text-gray-600 mt-2">Feature coming soon</p>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-frnsw-red hover:text-red-700">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
