import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on app load
  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token and get user profile
      const userData = await authService.getProfile();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      // Remove invalid token
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const response = await authService.login(email, password);
      
      // Store token
      localStorage.setItem('authToken', response.token);
      
      // Set user data (may include must_change_password)
      setUser(response.user);
      setIsAuthenticated(true);
      
      toast.success(`Welcome back, ${response.user.first_name}!`);
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      const response = await authService.register(userData);
      toast.success('Registration successful! Please check your email to verify your account.');
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.errors?.[0]?.msg || 
                          'Registration failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    try {
      // Remove token
      localStorage.removeItem('authToken');
      
      // Clear user data
      setUser(null);
      setIsAuthenticated(false);
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      
      // Update local user state if successful
      if (response.user) {
        setUser(prevUser => ({ ...prevUser, ...response.user }));
      }
      
      toast.success('Profile updated successfully');
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Profile refresh failed:', error);
      // If profile refresh fails, user might be logged out
      if (error.response?.status === 401) {
        logout();
      }
      throw error;
    }
  }, [logout]);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password change failed';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // Request password reset
  const requestPasswordReset = useCallback(async (email) => {
    try {
      const response = await authService.requestPasswordReset(email);
      toast.success('Password reset link sent to your email');
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password reset request failed';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // Reset password with token
  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      const response = await authService.resetPassword(token, newPassword);
      toast.success('Password reset successfully. You can now log in.');
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password reset failed';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // Verify email
  const verifyEmail = useCallback(async (token) => {
    try {
      const response = await authService.verifyEmail(token);
      toast.success('Email verified successfully! You can now log in.');
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Email verification failed';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Profile refresh failed:', error);
      // If profile refresh fails, user might be logged out
      if (error.response?.status === 401) {
        logout();
      }
      throw error;
    }
  }, [logout]);

  // Check if user has admin privileges
  const isAdmin = useCallback(() => {
    return user?.is_admin === true;
  }, [user]);

  // Check if user has host admin privileges
  const isHostAdmin = useCallback(() => {
    return user?.is_host_admin === true;
  }, [user]);

  // Get user's full name
  const getUserFullName = useCallback(() => {
    if (!user) return '';
    return `${user.first_name} ${user.last_name}`;
  }, [user]);

  // Get user's initials
  const getUserInitials = useCallback(() => {
    if (!user) return '';
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`;
  }, [user]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Set up axios interceptor for token
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      authService.setAuthToken(token);
    }
  }, []);

  // Listen for storage changes (logout from another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'authToken' && !e.newValue && isAuthenticated) {
        // Token was removed in another tab
        setUser(null);
        setIsAuthenticated(false);
        toast.info('You have been logged out');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAuthenticated]);

  const value = {
    // State
    user,
    loading,
    isAuthenticated,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    verifyEmail,
    refreshProfile,
    checkAuthStatus,
    
    // Helpers
    isAdmin,
    isHostAdmin,
    getUserFullName,
    getUserInitials
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};