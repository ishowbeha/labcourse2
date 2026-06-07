import { create } from 'zustand';
import api from '../services/api';

const fetchUserProfile = async () => {
  try {
    return await api.get('/auth/profile');
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
};

const refreshAccessToken = async () => {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh-token`,
      {},
      { withCredentials: true }
    );
    const newAccessToken = response.data?.data?.accessToken;
    if (newAccessToken) {
      localStorage.setItem('token', newAccessToken);
      return newAccessToken;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    console.error('Failed to refresh token:', error);
  }
  return null;
};

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: true,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),

  initAuth: async () => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      const profile = await fetchUserProfile();
      if (profile) {
        const user = profile.data || profile;
        set({ user, token: storedToken });
      } else {
        const newToken = await refreshAccessToken();
        if (newToken) {
          const newProfile = await fetchUserProfile();
          if (newProfile) {
            set({ user: newProfile.data || newProfile, token: newToken });
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            set({ user: null, token: null });
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({ user: null, token: null });
        }
      }
    }

    set({ loading: false });
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: basicUserData, accessToken } = response.data || response;

      localStorage.setItem('token', accessToken);
      set({ token: accessToken });

      const profileResponse = await fetchUserProfile();
      const fullUserProfile = profileResponse?.data || profileResponse;

      if (fullUserProfile) {
        localStorage.setItem('user', JSON.stringify(fullUserProfile));
        set({ user: fullUserProfile });
        return { success: true, user: fullUserProfile };
      }

      const fallbackUser = {
        id: basicUserData.id,
        firstName: basicUserData.firstName,
        lastName: basicUserData.lastName,
        email: basicUserData.email,
        roles: [],
      };
      localStorage.setItem('user', JSON.stringify(fallbackUser));
      set({ user: fallbackUser });
      return { success: true, user: fallbackUser };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  isAdmin: () => {
    const { user } = get();
    if (!user) return false;
    return Array.isArray(user.roles) && user.roles.includes('admin');
  },

  hasRole: (roleName) => {
    const { user } = get();
    if (!user) return false;
    return Array.isArray(user.roles) && user.roles.includes(roleName);
  },

  updateUser: (updatedData) => {
    const { user } = get();
    const updatedUser = { ...user, ...updatedData };
    set({ user: updatedUser });
    localStorage.setItem('user', JSON.stringify(updatedUser));
  },

  get isAuthenticated() {
    const { token, user } = get();
    return !!token && !!user;
  },
}));

export const useAuth = () => {
  const store = useAuthStore();
  return {
    ...store,
    isAuthenticated: !!store.token && !!store.user,
  };
};
