import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Hello {user?.first_name}! Profile functionality will be implemented here.</p>
      </div>
    </div>
  );
};

export default Profile;
