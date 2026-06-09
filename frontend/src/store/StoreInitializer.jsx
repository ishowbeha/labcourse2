import { useEffect } from 'react';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';
import { useSocketStore } from './socketStore';

// ===== PATCH: Intercept localStorage.removeItem('token') =====
// When user deletes the access token from DevTools, we intercept it
// and immediately regenerate it from the httpOnly refresh cookie.
// This prevents React from ever seeing a missing token.
(function patchLocalStorage() {
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  let isRefreshing = false;

  localStorage.removeItem = function(key) {
    // Only intercept 'token' deletion
    if (key !== 'token') {
      originalRemoveItem(key);
      return;
    }

    // Check if refresh cookie exists
    const hasCookie = document.cookie.includes('refreshToken=');
    if (!hasCookie) {
      originalRemoveItem(key);
      return;
    }

    // Don't actually delete - try to refresh first
    if (isRefreshing) return;
    isRefreshing = true;

    (async () => {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        const body = response.data?.data || response.data;
        const newToken = body?.accessToken || response.data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem('token', newToken);
          const { useAuthStore } = await import('./authStore');
          useAuthStore.getState().setToken(newToken);
          
          // Re-fetch profile
          const profRes = await axios.get(
            `${import.meta.env.VITE_API_URL || '/api'}/auth/profile`,
            { headers: { Authorization: `Bearer ${newToken}` }, withCredentials: true }
          );
          const profile = profRes.data?.data || profRes.data;
          if (profile) {
            localStorage.setItem('user', JSON.stringify(profile));
            useAuthStore.getState().setUser(profile);
          }
          console.log('✅ Token auto-regenerated after deletion attempt');
        } else {
          originalRemoveItem('token');
        }
      } catch (e) {
        console.warn('Token refresh failed after deletion:', e.message);
        originalRemoveItem('token');
      } finally {
        isRefreshing = false;
      }
    })();
  };

  // Also patch setItem to detect when token is set to empty/null
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    if (key === 'token' && (!value || value === 'null' || value === 'undefined')) {
      // Treat setting token to empty as deletion
      localStorage.removeItem('token');
      return;
    }
    originalSetItem(key, value);
  };
})();

export default function StoreInitializer() {
  const loading = useAuthStore((s) => s.loading);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const initAuth = useAuthStore((s) => s.initAuth);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const resetSettings = useSettingsStore((s) => s.resetToDefaults);
  const connect = useSocketStore((s) => s.connect);
  const disconnect = useSocketStore((s) => s.disconnect);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (loading) return;
    loadSettings();
  }, [loading, loadSettings, token, user?.id]);

  useEffect(() => {
    if (loading) return;

    if (token && user) {
      connect(token);
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } else {
      disconnect();
      resetSettings();
    }

    return () => disconnect();
  }, [loading, token, user?.id, connect, disconnect, resetSettings]);

  return null;
}
