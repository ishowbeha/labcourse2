import { useEffect, useRef } from 'react';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';
import { useSocketStore } from './socketStore';
import { getTokenExpiryMs, refreshAccessToken } from '../utils/authSession';

export default function StoreInitializer() {
  const loading = useAuthStore((s) => s.loading);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const initAuth = useAuthStore((s) => s.initAuth);
  const checkSession = useAuthStore((s) => s.checkSession);
  const forceLogout = useAuthStore((s) => s.forceLogout);
  const setToken = useAuthStore((s) => s.setToken);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const resetSettings = useSettingsStore((s) => s.resetToDefaults);
  const connect = useSocketStore((s) => s.connect);
  const disconnect = useSocketStore((s) => s.disconnect);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Detect manual token/cookie deletion in DevTools (same tab + other tabs)
  useEffect(() => {
    if (loading) return undefined;

    const runCheck = () => checkSession();
    runCheck();

    const intervalId = window.setInterval(runCheck, 2000);
    const onStorage = (event) => {
      if (!event.key || event.key === 'token' || event.key === 'user') {
        runCheck();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', onStorage);
    };
  }, [loading, checkSession]);

  // Proactively refresh access token before it expires
  useEffect(() => {
    if (loading || !token) return undefined;

    const scheduleRefresh = () => {
      const expiresAt = getTokenExpiryMs(token);
      if (!expiresAt) return;

      const refreshIn = Math.max(expiresAt - Date.now() - 60_000, 5_000);
      refreshTimerRef.current = window.setTimeout(async () => {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setToken(newToken);
        } else {
          forceLogout({ redirect: true, callApi: true });
        }
      }, refreshIn);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, [loading, token, setToken, forceLogout]);

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
