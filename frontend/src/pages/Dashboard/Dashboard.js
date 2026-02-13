import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { recallService } from '../../services/recallService';

const Dashboard = () => {
  const { user } = useAuth();
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await recallService.getAllRecalls();
        setRecalls(res.recalls || []);
      } catch (_) { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const upcoming = recalls.filter(r => {
    const d = new Date(`${r.date}T00:00:00`);
    return d >= new Date(new Date().toDateString()) && r.status === 'active';
  });

  const formatTime = (t) => t.substring(0, 5);
  const formatDate = (ds) => new Date(`${ds}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Station: {user?.station || 'Not set'} | Staff Number: {user?.staff_number}
          </p>
        </div>
      </div>

      {/* Upcoming recalls summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Recalls</h3>
        {loading ? (
          <div className="animate-pulse h-20 bg-gray-100 rounded" />
        ) : upcoming.length === 0 ? (
          <p className="text-gray-500">No upcoming recalls scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 5).map(r => (
              <Link key={r.id} to={`/recalls/${r.id}`} className="block border-l-4 border-frnsw-red pl-4 py-2 hover:bg-gray-50 rounded-r transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-900">{r.suburb}</span>
                    <span className="text-sm text-gray-500 ml-2">{formatDate(r.date)} {formatTime(r.start_time)}-{formatTime(r.end_time)}</span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{r.total_bids || 0} bids</span>
                </div>
              </Link>
            ))}
            {upcoming.length > 5 && (
              <Link to="/recalls" className="text-sm text-frnsw-red hover:text-red-700">View all {upcoming.length} recalls</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
