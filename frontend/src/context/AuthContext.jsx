import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

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
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Function to refresh the access token using the cookie
  const refreshAccessToken = async () => {
    try {
      // Use raw axios without interceptor to avoid circular dependency
      const axios = (await import('axios')).default;
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );
      const newAccessToken = response.data?.data?.accessToken;
      if (newAccessToken) {
        localStorage.setItem('token', newAccessToken);
        setToken(newAccessToken);
        return true;
      }
    } catch (error) {
      // If error is 401, it means the cookie is missing or invalid
      if (error.response?.status === 401) {
        // No valid refresh token cookie, force logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      }
      console.error('Failed to refresh token:', error);
    }
    return false;
  };


  // Fetch user profile to get roles
  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      
      if (storedUser && storedToken) {
        // Verify the token is still valid by fetching profile
        const profile = await fetchUserProfile();
        if (profile) {
          setUser(profile.data || profile);
          setToken(storedToken);
        } else {
          // Token might be expired, try to refresh it
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Fetch profile with new token
            const newProfile = await fetchUserProfile();
            if (newProfile) {
              setUser(newProfile.data || newProfile);
            } else {
              // Still can't get profile, clear storage
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          } else {
            // Refresh failed, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      }
      setLoading(false);
    };
    
    initAuth();

    // Listen for storage events (when token is deleted manually)
    const handleStorageChange = async (e) => {
      if (e.key === 'token' && !e.newValue && localStorage.getItem('user')) {
        // Token was deleted but user data still exists - try to refresh
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          // Refresh failed, clear user data
          localStorage.removeItem('user');
          setUser(null);
          setToken(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically if token is missing but user exists
    const checkTokenInterval = setInterval(async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!storedToken && storedUser) {
        // Token missing but user exists - try to refresh
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          // Refresh failed, clear user data
          localStorage.removeItem('user');
          setUser(null);
          setToken(null);
        }
      } else if (storedToken && storedUser) {
        // Token exists but check if cookie is missing
        try {
          // Try to make a refresh call to test if cookie exists
          const axios = (await import('axios')).default;
          await axios.post(
            `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh-token`,
            {},
            { withCredentials: true }
          );
          // Cookie exists, all good
        } catch (error) {
          // If refresh fails with 401, cookie is missing
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setToken(null);
          }
        }
      }
    }, 3000); // Check every 3 seconds

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkTokenInterval);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      // The API interceptor unwraps one level, so response has: { success, message, data: { user, accessToken } }
      // Note: refreshToken is now in httpOnly cookie, not in response body
      const { user: basicUserData, accessToken } = response.data || response;
      
      // Store access token only (refreshToken is in httpOnly cookie)
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      
      // Fetch full user profile with roles
      const profileResponse = await fetchUserProfile();
      const fullUserProfile = profileResponse?.data || profileResponse;
      
      if (fullUserProfile) {
        localStorage.setItem('user', JSON.stringify(fullUserProfile));
        setUser(fullUserProfile);
        return { success: true, user: fullUserProfile };
      } else {
        // Fallback to basic user data without roles
        const fallbackUser = {
          id: basicUserData.id,
          firstName: basicUserData.firstName,
          lastName: basicUserData.lastName,
          email: basicUserData.email,
          roles: [] // No roles available
        };
        localStorage.setItem('user', JSON.stringify(fallbackUser));
        setUser(fallbackUser);
        return { success: true, user: fallbackUser };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please check your credentials.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  const isAdmin = () => {
    if (!user) return false;
    // Check if user has admin role
    if (user.roles) {
      return user.roles.includes('admin');
    }
    return false;
  };

  const hasRole = (roleName) => {
    if (!user) return false;
    if (user.roles) {
      return user.roles.includes(roleName);
    }
    return false;
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin,
    hasRole,
    updateUser,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;