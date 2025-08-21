import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { recallService } from '../../services/recallService';
import toast from 'react-hot-toast';

const PastBids = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, my-bids, past-bids

  useEffect(() => {
    loadHistory();
  }, [filter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      let response;
      
      if (filter === 'my-bids') {
        response = await recallService.getMyBids();
        setHistory(response.history || []);
      } else {
        response = await recallService.getPastBids();
        setHistory(response.history || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load bidding history');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => timeString.substring(0, 5);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'bid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'not_available':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'not_bid':
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'bid':
        return '✅';
      case 'not_available':
        return '❌';
      case 'not_bid':
      default:
        return '⏳';
    }
  };

  const getAssignmentStatusColor = (status) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frnsw-red"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bidding History</h1>
          <p className="text-lg text-gray-600">View past recall bids and assignments</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'all', label: 'All Past Bids', description: 'Complete bidding history for all recalls' },
              { key: 'my-bids', label: 'My Bids', description: 'Your personal bidding history' }
            ].map(({ key, label, description }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === key
                    ? 'bg-white text-frnsw-red shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title={description}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No history found</h3>
              <p className="text-gray-500">
                {filter === 'my-bids' 
                  ? "You haven't bid on any recalls yet." 
                  : "No past recall bids found."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recall Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item, index) => (
                    <tr key={`${item.recall_id}-${item.staff_number || index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.suburb} - Station {item.station}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(item.date)} • {formatTime(item.start_time)}-{formatTime(item.end_time)}
                          </div>
                          {item.description && (
                            <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.first_name} {item.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            #{item.staff_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.response)}`}>
                          <span className="mr-2">{getStatusIcon(item.response)}</span>
                          {item.response === 'bid' ? 'Bid' : 
                           item.response === 'not_available' ? 'Not Available' : 'Not Bid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.assigned_user_id ? (
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAssignmentStatusColor(item.assignment_status)}`}>
                              {item.assignment_status}
                            </span>
                            {item.assigned_user_id === item.staff_number && (
                              <div className="text-xs text-gray-500 mt-1">
                                {item.hours}h • {item.assigned_by_first_name} {item.assigned_by_last_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.response_time ? formatDateTime(item.response_time) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {history.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-gray-900">{history.length}</div>
              <div className="text-sm text-gray-600">Total Responses</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-green-600">
                {history.filter(item => item.response === 'bid').length}
              </div>
              <div className="text-sm text-gray-600">Total Bids</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-red-600">
                {history.filter(item => item.response === 'not_available').length}
              </div>
              <div className="text-sm text-gray-600">Not Available</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-blue-600">
                {history.filter(item => item.assigned_user_id).length}
              </div>
              <div className="text-sm text-gray-600">Assigned</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PastBids;
