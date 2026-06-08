import { useEffect } from 'react';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';
import { useSocketStore } from './socketStore';

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
