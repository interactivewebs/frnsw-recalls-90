import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Station: {user?.station} | Employee ID: {user?.employee_id}
          </p>
        </div>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button className="bg-frnsw-red text-white px-4 py-3 rounded-md text-center hover:bg-red-700 transition-colors">
            View All Recalls
          </button>
          <button className="bg-blue-600 text-white px-4 py-3 rounded-md text-center hover:bg-blue-700 transition-colors">
            View Calendar
          </button>
          <button className="bg-green-600 text-white px-4 py-3 rounded-md text-center hover:bg-green-700 transition-colors">
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
