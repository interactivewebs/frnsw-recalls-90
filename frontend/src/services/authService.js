import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? '/api'
    : 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      // Remove invalid token
      localStorage.removeItem('authToken');
      
      // Only redirect to login if not already on auth pages
      const currentPath = window.location.pathname;
      const authPages = ['/login', '/register', '/verify-email', '/reset-password'];
      const isOnAuthPage = authPages.some(page => currentPath.includes(page));
      
      if (!isOnAuthPage) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  // Set auth token for requests
  setAuthToken(token) {
    if (token) {
      apiClient.defaults.headers.Authorization = `Bearer ${token}`;
      localStorage.setItem('authToken', token);
    } else {
      delete apiClient.defaults.headers.Authorization;
      localStorage.removeItem('authToken');
    }
  },

  // Remove auth token
  removeAuthToken() {
    delete apiClient.defaults.headers.Authorization;
    localStorage.removeItem('authToken');
  },

  // Login user
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });
      
      // Set token for future requests
      if (response.data.token) {
        this.setAuthToken(response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Register new user
  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', {
        firstName: userData.first_name,
        lastName: userData.last_name,
        staffNumber: userData.staffNumber,
        email: userData.email,
        password: userData.password
      });
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Verify email
  async verifyEmail(token) {
    try {
      const response = await apiClient.get(`/auth/verify-email?token=${token}`);
      return response.data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  },

  // Get user profile
  async getProfile() {
    try {
      const response = await apiClient.get('/auth/profile');
      return response.data.user;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await apiClient.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await apiClient.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  // Request password reset
  async requestPasswordReset(email) {
    try {
      const response = await apiClient.post('/auth/forgot-password', {
        email
      });
      return response.data;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  },

  // Reset password with token
  async resetPassword(token, newPassword) {
    try {
      const response = await apiClient.post('/auth/reset-password', {
        token,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },

  // Logout (client-side only)
  logout() {
    this.removeAuthToken();
  }
};

export default apiClient;