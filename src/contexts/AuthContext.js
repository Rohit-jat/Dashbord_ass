import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    // Don't check auth status if we're in the middle of logging in
    if (isLoggingIn) {
      console.log('Skipping auth check - user is logging in');
      return;
    }

    const checkAuthStatus = async () => {
      try {
        if (token) {
          console.log('Checking auth status with token:', token.substring(0, 20) + '...');
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token by fetching user profile
          const response = await api.get('/api/user/profile');
          console.log('Profile response:', response.data);
          
          if (response.data.success && response.data.user) {
            console.log('Setting user as authenticated:', response.data.user);
            setUser(response.data.user);
            setIsAuthenticated(true);
          } else {
            console.log('Invalid profile response, but not logging out');
            // Don't logout, just keep current state
          }
        } else {
          console.log('No token found, setting loading to false');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Don't logout on any errors, just keep current state
        console.log('Keeping current authentication state despite error');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [token, isLoggingIn]);

  // Handle local login
  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      setIsLoggingIn(true);
      
      const response = await api.post('/api/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      const { token: authToken, user: userData } = response.data;
      
      if (authToken && userData) {
        console.log('Login successful, calling handleAuthSuccess');
        handleAuthSuccess(authToken, userData);
        return { success: true };
      } else {
        console.log('Login response missing token or user data');
        setIsLoggingIn(false);
        return { success: false, error: 'Invalid login response' };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Login failed';
      toast.error(errorMessage);
      setIsLoggingIn(false);
      return { success: false, error: errorMessage };
    }
  };

  // Handle local registration
  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      const { token: authToken, user: newUser } = response.data;
      
      handleAuthSuccess(authToken, newUser);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = (authToken, userData) => {
    console.log('handleAuthSuccess called with:', { authToken: authToken?.substring(0, 20) + '...', userData });
    
    // Set token in API headers first
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    
    // Save to localStorage
    localStorage.setItem('token', authToken);
    
    // Update state
    setUser(userData);
    setIsAuthenticated(true);
    setToken(authToken);
    
    // Reset login flag after a short delay to allow navigation
    setTimeout(() => {
      setIsLoggingIn(false);
    }, 1000);
    
    console.log('State updated, navigating to dashboard');
    toast.success(`Welcome back, ${userData.name}!`);
    navigate('/dashboard');
  };

  // Logout function
  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    
    // Remove token from API headers
    delete api.defaults.headers.common['Authorization'];
    
    toast.success('Logged out successfully');
    navigate('/login');
  };
  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/api/user/profile', profileData);
      if (response.data.success) {
        setUser(response.data.user);
        toast.success('Profile updated successfully');
        return { success: true, user: response.data.user };
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update profile';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const response = await api.get('/api/user/profile');
      if (response.data.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isLoggingIn,
    token,
    login,
    register,
    logout,
    updateProfile,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
