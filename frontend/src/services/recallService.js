import apiClient from './authService';

export const recallService = {
  // Get all recalls
  async getAllRecalls() {
    try {
      const response = await apiClient.get('/recalls');
      return response.data;
    } catch (error) {
      console.error('Error fetching recalls:', error);
      throw error;
    }
  },

  // Get recalls for a specific date
  async getRecallsForDate(date) {
    try {
      const response = await apiClient.get(`/recalls/date/${date}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recalls for date:', error);
      throw error;
    }
  },

  // Get recall details with bidding information
  async getRecallDetails(recallId) {
    try {
      const response = await apiClient.get(`/recalls/${recallId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recall details:', error);
      throw error;
    }
  },

  // Submit a bid response
  async submitBid(recallId, response) {
    try {
      const response_data = await apiClient.post(`/recalls/${recallId}/bid`, { response });
      return response_data.data;
    } catch (error) {
      console.error('Error submitting bid:', error);
      throw error;
    }
  },

  // Award recall to a user (admin only)
  async awardRecall(recallId, userId, hours, note) {
    try {
      const response = await apiClient.post(`/recalls/${recallId}/award`, { 
        user_id: userId, 
        hours, 
        note 
      });
      return response.data;
    } catch (error) {
      console.error('Error awarding recall:', error);
      throw error;
    }
  },

  // Get past bids history
  async getPastBids() {
    try {
      const response = await apiClient.get('/recalls/history/past-bids');
      return response.data;
    } catch (error) {
      console.error('Error fetching past bids:', error);
      throw error;
    }
  },

  // Create new recall (admin only)
  async createRecall(data) {
    try {
      const response = await apiClient.post('/recalls', data);
      return response.data;
    } catch (error) {
      console.error('Error creating recall:', error);
      throw error;
    }
  },

  // Update recall (admin only)
  async updateRecall(recallId, data) {
    try {
      const response = await apiClient.put(`/recalls/${recallId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating recall:', error);
      throw error;
    }
  },

  // Get user's bidding history
  async getMyBids() {
    try {
      const response = await apiClient.get('/recalls/history/my-bids');
      return response.data;
    } catch (error) {
      console.error('Error fetching my bids:', error);
      throw error;
    }
  }
};