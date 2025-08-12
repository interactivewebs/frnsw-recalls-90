import apiClient from './authService';

export const recallService = {
  // Get all recalls with pagination and filters
  async getRecalls(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add pagination params
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      
      // Add filter params
      if (params.status) queryParams.append('status', params.status);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      
      const response = await apiClient.get(`/recalls?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Get recalls error:', error);
      throw error;
    }
  },

  // Get single recall by ID
  async getRecall(id) {
    try {
      const response = await apiClient.get(`/recalls/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get recall error:', error);
      throw error;
    }
  },

  // Create new recall (admin only)
  async createRecall(recallData) {
    try {
      const response = await apiClient.post('/recalls', {
        date: recallData.date,
        startTime: recallData.startTime,
        endTime: recallData.endTime,
        suburb: recallData.suburb,
        description: recallData.description
      });
      return response.data;
    } catch (error) {
      console.error('Create recall error:', error);
      throw error;
    }
  },

  // Update recall (admin only)
  async updateRecall(id, recallData) {
    try {
      const response = await apiClient.put(`/recalls/${id}`, {
        date: recallData.date,
        startTime: recallData.startTime,
        endTime: recallData.endTime,
        suburb: recallData.suburb,
        description: recallData.description,
        editReason: recallData.editReason
      });
      return response.data;
    } catch (error) {
      console.error('Update recall error:', error);
      throw error;
    }
  },

  // Cancel recall (admin only)
  async cancelRecall(id, reason) {
    try {
      const response = await apiClient.delete(`/recalls/${id}`, {
        data: { reason }
      });
      return response.data;
    } catch (error) {
      console.error('Cancel recall error:', error);
      throw error;
    }
  },

  // Respond to recall (available/not available)
  async respondToRecall(id, response, token = null) {
    try {
      const payload = { response };
      if (token) payload.token = token;
      
      const result = await apiClient.post(`/recalls/${id}/respond`, payload);
      return result.data;
    } catch (error) {
      console.error('Recall response error:', error);
      throw error;
    }
  },

  // Assign user to recall (admin only)
  async assignUserToRecall(recallId, userId, options = {}) {
    try {
      const response = await apiClient.post(`/recalls/${recallId}/assign`, {
        userId,
        note: options.note,
        overrideConflict: options.overrideConflict
      });
      return response.data;
    } catch (error) {
      console.error('Assign user error:', error);
      throw error;
    }
  },

  // Remove user assignment (admin only)
  async removeAssignment(recallId, userId, reason = '') {
    try {
      const response = await apiClient.delete(`/recalls/${recallId}/assign/${userId}`, {
        data: { reason }
      });
      return response.data;
    } catch (error) {
      console.error('Remove assignment error:', error);
      throw error;
    }
  },

  // Get fairness ranking for recall (admin only)
  async getFairnessRanking(recallId) {
    try {
      const response = await apiClient.get(`/recalls/${recallId}/fairness`);
      return response.data;
    } catch (error) {
      console.error('Get fairness ranking error:', error);
      throw error;
    }
  },

  // Get recalls for calendar view
  async getRecallsForCalendar(startDate, endDate) {
    try {
      const response = await apiClient.get('/recalls', {
        params: {
          startDate,
          endDate,
          limit: 1000 // Get all recalls in date range
        }
      });
      
      // Transform for calendar component
      return response.data.recalls.map(recall => ({
        id: recall.id,
        title: `🚨 ${recall.suburb}`,
        start: new Date(`${recall.date} ${recall.start_time}`),
        end: new Date(`${recall.date} ${recall.end_time}`),
        resource: {
          ...recall,
          type: 'recall'
        }
      }));
    } catch (error) {
      console.error('Get calendar recalls error:', error);
      throw error;
    }
  },

  // Get recent recalls for dashboard
  async getRecentRecalls(limit = 5) {
    try {
      const response = await apiClient.get('/recalls', {
        params: {
          limit,
          page: 1
        }
      });
      return response.data.recalls;
    } catch (error) {
      console.error('Get recent recalls error:', error);
      throw error;
    }
  },

  // Get user's recall statistics
  async getUserRecallStats(userId = null) {
    try {
      const url = userId ? `/reports/user-history/${userId}` : '/reports/user-history';
      const response = await apiClient.get(url, {
        params: { limit: 1 } // Just get summary stats
      });
      return response.data.summary;
    } catch (error) {
      console.error('Get user recall stats error:', error);
      throw error;
    }
  }
};

export default recallService;