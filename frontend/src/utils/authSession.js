import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const hasSessionCookie = () =>
  document.cookie.split(';').some((c) => c.trim() === 'isLoggedIn=true');

export const getTokenExpiryMs = (token) => {
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000;
  } catch {
    return 0;
  }
};

export const refreshAccessToken = async () => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh-token`,
      {},
      { withCredentials: true }
    );
    const newAccessToken = response.data?.data?.accessToken;
    if (newAccessToken) {
      localStorage.setItem('token', newAccessToken);
      return newAccessToken;
    }
  } catch {
    // Refresh cookie missing, expired, or revoked
  }
  return null;
};

export const clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const revokeServerSession = async () => {
  try {
    await axios.post(
      `${API_BASE_URL}/auth/logout`,
      {},
      { withCredentials: true }
    );
  } catch {
    // Session may already be invalid
  }
};
