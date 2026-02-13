import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { recallService } from '../../services/recallService';
import toast from 'react-hot-toast';

const CreateRecall = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: '',
    start_time: '09:00',
    end_time: '14:00',
    suburb: '',
    station: '90',
    description: ''
  });

  if (!user?.is_admin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">Only administrators can create recalls.</p>
      </div>
    );
  }

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.start_time || !form.end_time || !form.suburb) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const result = await recallService.createRecall(form);
      toast.success('Recall created successfully');
      navigate(`/recalls/${result.recallId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create recall');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create New Recall</h1>
        <button onClick={() => navigate('/recalls')} className="text-frnsw-red hover:text-red-700">
          Back to Recalls
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" name="date" value={form.date} onChange={onChange} required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-frnsw-red focus:border-frnsw-red" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suburb / Location *</label>
              <input type="text" name="suburb" value={form.suburb} onChange={onChange} required placeholder="e.g. Bundeena"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-frnsw-red focus:border-frnsw-red" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input type="time" name="start_time" value={form.start_time} onChange={onChange} required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-frnsw-red focus:border-frnsw-red" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input type="time" name="end_time" value={form.end_time} onChange={onChange} required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-frnsw-red focus:border-frnsw-red" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
              <input type="text" name="station" value={form.station} onChange={onChange} placeholder="90"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-frnsw-red focus:border-frnsw-red" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={onChange} rows={3} placeholder="Optional description..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-frnsw-red focus:border-frnsw-red" />
          </div>

          <div className="flex space-x-4">
            <button type="submit" disabled={loading}
              className="px-6 py-2 bg-frnsw-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Recall'}
            </button>
            <button type="button" onClick={() => navigate('/recalls')}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRecall;
