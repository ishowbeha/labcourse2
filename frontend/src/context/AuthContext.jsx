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

  // Fetch user profile to get roles
  const fetchUserProfile = async (authToken) => {
    try {
      const response = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
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
        const parsedUser = JSON.parse(storedUser);
        // Verify the token is still valid by fetching profile
        const profile = await fetchUserProfile(storedToken);
        if (profile) {
          setUser(profile);
          setToken(storedToken);
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: basicUserData, accessToken } = response.data;
      
      // Store token
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      
      // Fetch full user profile with roles
      const fullUserProfile = await fetchUserProfile(accessToken);
      
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
      const response = await api.post('/auth/register', {
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        password: userData.password
      });
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

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin,
    hasRole,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;