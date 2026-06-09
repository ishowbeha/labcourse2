import { useEffect, useRef } from 'react';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';
import { useSocketStore } from './socketStore';
import { getTokenExpiryMs, refreshAccessToken, checkRefreshToken } from '../utils/authSession';

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

    // cookieStore API: fires instantly when a readable cookie changes (Chrome 87+)
    // Catches isLoggedIn deletion with zero polling delay.
    let cookieStoreCleanup = null;
    if (typeof cookieStore !== 'undefined') {
      const onCookieChange = (event) => {
        const deleted = event.deleted || [];
        if (deleted.some((c) => c.name === 'isLoggedIn')) {
          runCheck();
        }
      };
      cookieStore.addEventListener('change', onCookieChange);
      cookieStoreCleanup = () => cookieStore.removeEventListener('change', onCookieChange);
    }

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', onStorage);
      cookieStoreCleanup?.();
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

  // Heartbeat: probe the server every 5 s to detect manual refreshToken cookie deletion.
  // The refreshToken is httpOnly so JS can't read it — only the server can verify it.
  useEffect(() => {
    if (loading || !token) return undefined;

    const probe = async () => {
      const alive = await checkRefreshToken();
      if (!alive) {
        // refreshToken cookie was deleted or expired — force logout immediately
        forceLogout({ redirect: true, callApi: false });
      }
    };

    // Run once immediately, then every 500 ms for near-instant detection
    probe();
    const heartbeatId = window.setInterval(probe, 500);
    return () => window.clearInterval(heartbeatId);
  }, [loading, token, forceLogout]);

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
