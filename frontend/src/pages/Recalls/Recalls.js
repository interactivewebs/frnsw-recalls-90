import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { recallService } from '../../services/recallService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Recalls = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, upcoming, past

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await recallService.getAllRecalls();
        setRecalls(response.recalls || []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load recalls');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatTime = (timeString) => {
    return timeString.substring(0, 5); // Convert "09:00:00" to "09:00"
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilteredRecalls = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'active':
        return recalls.filter(recall => recall.status === 'active');
      case 'upcoming':
        return recalls.filter(recall => {
          const recallDate = new Date(recall.date);
          return recallDate >= today && recall.status === 'active';
        });
      case 'past':
        return recalls.filter(recall => {
          const recallDate = new Date(recall.date);
          return recallDate < today;
        });
      default:
        return recalls;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (date) => {
    const recallDate = new Date(date);
    const today = new Date();
    const diffTime = recallDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'border-l-red-500'; // Today or past
    if (diffDays <= 3) return 'border-l-orange-500'; // Within 3 days
    if (diffDays <= 7) return 'border-l-yellow-500'; // Within a week
    return 'border-l-gray-300'; // More than a week
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Recalls</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const filteredRecalls = getFilteredRecalls();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Recalls</h1>
        {user?.is_admin && (
          <button className="px-4 py-2 bg-frnsw-red text-white rounded-lg hover:bg-red-700 transition-colors">
            + New Recall
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'all', label: 'All Recalls', count: recalls.length },
            { key: 'active', label: 'Active', count: recalls.filter(r => r.status === 'active').length },
            { key: 'upcoming', label: 'Upcoming', count: recalls.filter(r => {
              const recallDate = new Date(r.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return recallDate >= today && r.status === 'active';
            }).length },
            { key: 'past', label: 'Past', count: recalls.filter(r => {
              const recallDate = new Date(r.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return recallDate < today;
            }).length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === key
                  ? 'bg-white text-frnsw-red shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Recalls List */}
      <div className="bg-white shadow rounded-lg p-6">
        {filteredRecalls.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recalls found</h3>
            <p className="text-gray-500">No recalls match your current filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecalls.map(recall => (
              <div
                key={recall.id}
                className={`border-l-4 ${getPriorityColor(recall.date)} pl-4 py-4 bg-gray-50 rounded-r-lg hover:bg-gray-100 transition-colors`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{recall.suburb}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(recall.status)}`}>
                        {recall.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(recall.date)}
                      </div>
                      <div>
                        <span className="font-medium">Time:</span> {formatTime(recall.start_time)} - {formatTime(recall.end_time)}
                      </div>
                      <div>
                        <span className="font-medium">Station:</span> {recall.station}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {formatDateTime(recall.created_at)}
                      </div>
                    </div>
                    
                    {recall.description && (
                      <p className="text-gray-700 mt-3">{recall.description}</p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button onClick={() => navigate(`/recalls/${recall.id}`)} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                      View Details
                    </button>
                    {user?.is_admin && (
                      <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recalls;
