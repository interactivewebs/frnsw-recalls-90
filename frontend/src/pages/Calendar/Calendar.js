import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { recallService } from '../../services/recallService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Calendar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDateDetails, setShowDateDetails] = useState(false);
  const [dateRecalls, setDateRecalls] = useState([]);
  const [dateLoading, setDateLoading] = useState(false);

  // Load recalls from API
  useEffect(() => {
    const loadRecalls = async () => {
      try {
        setLoading(true);
        const response = await recallService.getAllRecalls();
        setRecalls(response.recalls || []);
      } catch (error) {
        console.error('Error loading recalls:', error);
        toast.error('Failed to load recalls');
      } finally {
        setLoading(false);
      }
    };
    loadRecalls();
  }, []);

  const handleDateClick = async (date) => {
    if (!date) return;
    
    setSelectedDate(date);
    setDateLoading(true);
    setShowDateDetails(true);
    
    try {
      const dateString = toLocalYmd(date);
      const response = await recallService.getRecallsForDate(dateString);
      setDateRecalls(response.recalls || []);
    } catch (error) {
      console.error('Error fetching recalls for date:', error);
      toast.error('Failed to fetch recalls for this date');
      setDateRecalls([]);
    } finally {
      setDateLoading(false);
    }
  };

  const formatTime = (timeString) => {
    return timeString.substring(0, 5); // Convert "09:00:00" to "09:00"
  };

  const formatDate = (value) => {
    const date = value instanceof Date
      ? value
      : new Date(`${value}T00:00:00`); // force local midnight to avoid UTC shift
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const toLocalYmd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getRecallsForDate = (date) => {
    if (!date) return [];
    const dateString = toLocalYmd(date);
    return recalls.filter(recall => recall.date === dateString);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Recall Calendar</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Recall Calendar</h1>
      
      {/* Calendar Navigation */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-xl font-semibold text-gray-900">{monthName}</h2>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        <button
          onClick={goToToday}
          className="mb-4 px-4 py-2 bg-frnsw-red text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Today
        </button>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {days.map((day, index) => {
            const recallsForDay = getRecallsForDate(day);
            const isToday = day && day.toDateString() === new Date().toDateString();
            const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
            
            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 bg-white cursor-pointer hover:bg-gray-50 transition-colors ${
                  !day || !isCurrentMonth ? 'bg-gray-50 text-gray-400 cursor-default' : ''
                } ${isToday ? 'ring-2 ring-frnsw-red' : ''}`}
                onClick={() => day && isCurrentMonth && handleDateClick(day)}
              >
                {day && (
                  <div className="text-sm font-medium mb-1">
                    {day.getDate()}
                  </div>
                )}
                
                {/* Recalls for this day */}
                {recallsForDay.map(recall => (
                  <div
                    key={recall.id}
                    className="text-xs p-1 mb-1 bg-frnsw-red text-white rounded truncate cursor-pointer hover:bg-red-700"
                    title={`${recall.suburb} - Station ${recall.station} (${formatTime(recall.start_time)}-${formatTime(recall.end_time)})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/recalls/${recall.id}`);
                    }}
                  >
                    {recall.suburb} - {formatTime(recall.start_time)}-{formatTime(recall.end_time)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Recalls List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Recalls</h3>
        {recalls.length === 0 ? (
          <p className="text-gray-500">No upcoming recalls</p>
        ) : (
          <div className="space-y-3">
            {recalls.map(recall => (
              <div key={recall.id} className="border-l-4 border-frnsw-red pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{recall.suburb}</h4>
                    <p className="text-sm text-gray-600">{formatDate(recall.date)}</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(recall.start_time)} - {formatTime(recall.end_time)} (Station {recall.station})
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    recall.status === 'active' ? 'bg-green-100 text-green-800' :
                    recall.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {recall.status}
                  </span>
                </div>
                {recall.description && (
                  <p className="text-sm text-gray-600 mt-1">{recall.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date Details Modal */}
      {showDateDetails && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Recalls for {formatDate(selectedDate)}
                </h3>
                <button
                  onClick={() => setShowDateDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {dateLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-frnsw-red mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading recalls...</p>
                </div>
              ) : dateRecalls.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recalls scheduled for this date.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dateRecalls.map(recall => (
                    <div key={recall.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{recall.suburb}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          recall.status === 'active' ? 'bg-green-100 text-green-800' :
                          recall.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {recall.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Time:</span> {formatTime(recall.start_time)} - {formatTime(recall.end_time)}
                        </div>
                        <div>
                          <span className="font-medium">Station:</span> {recall.station}
                        </div>
                      </div>
                      
                      {recall.description && (
                        <p className="text-gray-700 mb-3">{recall.description}</p>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {recall.total_responses > 0 && (
                            <span>{recall.total_responses} responses, {recall.total_bids} bids</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setShowDateDetails(false);
                            navigate(`/recalls/${recall.id}`);
                          }}
                          className="px-4 py-2 bg-frnsw-red text-white rounded hover:bg-red-700 transition-colors"
                        >
                          View Details & Bid
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
