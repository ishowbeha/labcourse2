import { create } from 'zustand';
import api from '../services/api';
import {
  clearAuthStorage,
  hasSessionCookie,
  refreshAccessToken,
  revokeServerSession,
} from '../utils/authSession';

let isLoggingOut = false;

const fetchUserProfile = async () => {
  try {
    return await api.get('/auth/profile');
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
};

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  loading: true,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),

  forceLogout: async ({ redirect = true, callApi = true } = {}) => {
    if (isLoggingOut) return;
    isLoggingOut = true;

    if (callApi) {
      await revokeServerSession();
    }
    clearAuthStorage();
    set({ user: null, token: null });
    if (redirect) {
      window.location.href = '/login';
    }
  },

  checkSession: () => {
    if (isLoggingOut) return false;

    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const sessionCookie = hasSessionCookie();
    const { token, user } = get();

    const hadSession = Boolean(token || user);
    const storageIntact = Boolean(storedToken && storedUser);
    const sessionValid = storageIntact && sessionCookie;

    if (hadSession && !sessionValid) {
      void get().forceLogout({ redirect: true, callApi: true });
      return false;
    }

    if (sessionValid && (!token || !user)) {
      set({
        token: storedToken,
        user: JSON.parse(storedUser),
      });
    }

    return sessionValid;
  },

  initAuth: async () => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const sessionCookie = hasSessionCookie();

    if (!sessionCookie) {
      if (storedToken || storedUser) {
        clearAuthStorage();
      }
      set({ user: null, token: null, loading: false });
      return;
    }

    if (storedToken && storedUser) {
      const profile = await fetchUserProfile();
      if (profile) {
        const user = profile.data || profile;
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token: storedToken, loading: false });
        return;
      }

      const newToken = await refreshAccessToken();
      if (newToken) {
        const newProfile = await fetchUserProfile();
        if (newProfile) {
          const user = newProfile.data || newProfile;
          localStorage.setItem('user', JSON.stringify(user));
          set({ user, token: newToken, loading: false });
          return;
        }
      }

      await get().forceLogout({ redirect: false, callApi: true });
      set({ loading: false });
      return;
    }

    if (!storedToken && sessionCookie) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        const newProfile = await fetchUserProfile();
        if (newProfile) {
          const user = newProfile.data || newProfile;
          localStorage.setItem('user', JSON.stringify(user));
          set({ user, token: newToken, loading: false });
          return;
        }
      }
    }

    clearAuthStorage();
    set({ user: null, token: null, loading: false });
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

  logout: async () => {
    await revokeServerSession();
    clearAuthStorage();
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
