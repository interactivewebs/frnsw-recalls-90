import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AdminPanel = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="text-gray-500 mt-2">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Admin functionality will be implemented here.</p>
      </div>
    </div>
  );
};

export default AdminPanel;
