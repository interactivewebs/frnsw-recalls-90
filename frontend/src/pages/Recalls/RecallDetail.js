import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { recallService } from '../../services/recallService';
import toast from 'react-hot-toast';

const RecallDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recall, setRecall] = useState(null);
  const [users, setUsers] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadRecallDetails();
  }, [id]);

  const loadRecallDetails = async () => {
    try {
      setLoading(true);
      const response = await recallService.getRecallDetails(id);
      setRecall(response.recall);
      setUsers(response.users);
      setAssignment(response.assignment);
      
      // Calculate hours from recall times
      if (response.recall) {
        const startTime = new Date(`2000-01-01 ${response.recall.start_time}`);
        const endTime = new Date(`2000-01-01 ${response.recall.end_time}`);
        const calculatedHours = (endTime - startTime) / (1000 * 60 * 60);
        setHours(calculatedHours.toFixed(2));
      }
    } catch (error) {
      console.error('Error loading recall details:', error);
      toast.error('Failed to load recall details');
    } finally {
      setLoading(false);
    }
  };

  const handleBidResponse = async (response) => {
    try {
      setSubmitting(true);
      await recallService.submitBid(id, response);
      toast.success(`Response submitted: ${response === 'bid' ? 'Bid submitted' : response === 'not_available' ? 'Marked as not available' : 'Bid withdrawn'}`);
      await loadRecallDetails(); // Refresh data
    } catch (error) {
      toast.error('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAwardRecall = async () => {
    if (!selectedUser || !hours) {
      toast.error('Please select a user and specify hours');
      return;
    }

    try {
      setAwarding(true);
      await recallService.awardRecall(id, selectedUser, parseFloat(hours), note);
      toast.success('Recall awarded successfully');
      await loadRecallDetails(); // Refresh data
    } catch (error) {
      toast.error('Failed to award recall');
    } finally {
      setAwarding(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frnsw-red"></div>
      </div>
    );
  }

  if (!recall) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recall Not Found</h2>
          <button
            onClick={() => navigate('/recalls')}
            className="px-4 py-2 bg-frnsw-red text-white rounded hover:bg-red-700"
          >
            Back to Recalls
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (timeString) => timeString.substring(0, 5);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isRecallAssigned = assignment && assignment.status === 'assigned';
  const canBid = !isRecallAssigned && recall.status === 'active';
  const userResponse = users.find(u => u.id === user.id)?.bid_status || 'not_bid';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/recalls')}
            className="text-frnsw-red hover:text-red-700 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Recalls
          </button>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{recall.suburb}</h1>
                <p className="text-lg text-gray-600">{formatDate(recall.date)}</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 text-sm rounded-full ${
                  recall.status === 'active' ? 'bg-green-100 text-green-800' :
                  recall.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {recall.status}
                </span>
                {isRecallAssigned && (
                  <div className="mt-2 text-sm text-gray-600">
                    Assigned to: {assignment.assigned_user_first_name} {assignment.assigned_user_last_name}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <span className="font-medium text-gray-700">Time:</span>
                <p className="text-lg">{formatTime(recall.start_time)} - {formatTime(recall.end_time)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Station:</span>
                <p className="text-lg">{recall.station}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created by:</span>
                <p className="text-lg">{recall.creator_first_name} {recall.creator_last_name}</p>
              </div>
            </div>
            
            {recall.description && (
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="text-gray-700 mt-1">{recall.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bidding Interface */}
        {canBid && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Response</h2>
            <div className="flex space-x-4">
              <button
                onClick={() => handleBidResponse('bid')}
                disabled={submitting || userResponse === 'bid'}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  userResponse === 'bid'
                    ? 'bg-green-100 text-green-800 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {userResponse === 'bid' ? 'Bid Submitted' : 'Submit Bid'}
              </button>
              
              <button
                onClick={() => handleBidResponse('not_available')}
                disabled={submitting || userResponse === 'not_available'}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  userResponse === 'not_available'
                    ? 'bg-red-100 text-red-800 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {userResponse === 'not_available' ? 'Marked Not Available' : 'Mark Not Available'}
              </button>
              
              <button
                onClick={() => handleBidResponse('not_bid')}
                disabled={submitting || userResponse === 'not_bid'}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  userResponse === 'not_bid'
                    ? 'bg-gray-100 text-gray-800 cursor-not-allowed'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {userResponse === 'not_bid' ? 'No Bid' : 'Withdraw Bid'}
              </button>
            </div>
          </div>
        )}

        {/* Admin Award Interface */}
        {user.is_admin && !isRecallAssigned && recall.status === 'active' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Award Recall</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Choose a user...</option>
                  {users
                    .filter(u => u.bid_status === 'bid')
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.days_since_last_recall} days since last recall)
                      </option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="5.0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Assignment note..."
                />
              </div>
            </div>
            
            <button
              onClick={handleAwardRecall}
              disabled={awarding || !selectedUser || !hours}
              className="px-6 py-3 bg-frnsw-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {awarding ? 'Awarding...' : 'Award Recall'}
            </button>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Staff Responses</h2>
            <p className="text-sm text-gray-600">Ordered by longest time since last recall</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Station
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Since Last Recall
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userItem.first_name} {userItem.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          #{userItem.staff_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userItem.station || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userItem.days_since_last_recall >= 9999 
                          ? 'bg-purple-100 text-purple-800'
                          : userItem.days_since_last_recall >= 30
                          ? 'bg-red-100 text-red-800'
                          : userItem.days_since_last_recall >= 14
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {userItem.days_since_last_recall >= 9999 ? 'Never' : `${userItem.days_since_last_recall} days`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(userItem.bid_status)}`}>
                        <span className="mr-2">{getStatusIcon(userItem.bid_status)}</span>
                        {userItem.bid_status === 'bid' ? 'Bid' : 
                         userItem.bid_status === 'not_available' ? 'Not Available' : 'Not Bid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userItem.response_time ? new Date(userItem.response_time).toLocaleString('en-AU') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecallDetail;
