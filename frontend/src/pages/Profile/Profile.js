import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Profile = () => {
  const { user, updateProfile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    station: user?.station || '',
    phone: user?.phone || '',
    email: user?.email || '',
    notify: user?.notify ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/@fire\.nsw\.gov\.au$/i.test(form.email)) {
      setError('Email must be a @fire.nsw.gov.au address');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ station: form.station, phone: form.phone, email: form.email, notify: form.notify });
      await refreshProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
              <input name="station" value={form.station} onChange={onChange} className="w-full border rounded px-3 py-2" placeholder="Menai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input name="phone" value={form.phone} onChange={onChange} className="w-full border rounded px-3 py-2" placeholder="e.g. 0400 000 000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (@fire.nsw.gov.au)</label>
            <input name="email" type="email" value={form.email} onChange={onChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="flex items-center space-x-2">
            <input id="notify" name="notify" type="checkbox" checked={form.notify} onChange={onChange} />
            <label htmlFor="notify" className="text-sm text-gray-700">Receive notifications</label>
          </div>
          <div className="pt-2">
            <button disabled={loading} className="px-4 py-2 bg-frnsw-red text-white rounded hover:bg-red-700 disabled:opacity-50">{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
