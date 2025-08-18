import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-6xl font-bold text-frnsw-red mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to="/"
            className="block w-full bg-frnsw-red text-white px-4 py-3 rounded-md hover:bg-red-700 transition-colors font-medium"
          >
            Go to Dashboard
          </Link>
          
          <Link
            to="/recalls"
            className="block w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            View Recalls
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="block w-full text-frnsw-red hover:text-red-700 transition-colors font-medium"
          >
            ← Go Back
          </button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>If you believe this is an error, please contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
