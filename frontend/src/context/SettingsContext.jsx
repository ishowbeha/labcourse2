import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SettingsContext = createContext(null);

// useSettings — safe version that NEVER throws even outside a provider
// Returns DEFAULTS if called outside the tree (graceful degradation)
export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  // Return context if available, otherwise return a safe default object
  // so pages don't crash if provider isn't mounted yet
  if (!ctx) return _SAFE_DEFAULTS;
  return ctx;
};

// Default fallback so app works even if backend is down
const DEFAULTS = {
  site_name: 'Stadium Tickets',
  site_tagline: 'Your #1 destination for football tickets',
  default_currency: 'EUR',
  timezone: 'Europe/Berlin',
  language: 'en',
  max_tickets_per_order: 10,
  booking_window_days: 30,
  auto_cancel_minutes: 30,
  refund_enabled: true,
  stripe_test_mode: true,
  stripe_publishable_key: '',
  stripe_secret_key: '',
  tax_rate: 20,
  max_discount_percent: 50,
  allow_stacking_coupons: false,
  coupon_expiry_days: 30,
  email_notifications_enabled: true,
  admin_alert_emails: true,
  admin_email: '',
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_user: '',
  smtp_password: '',
  smtp_sender: '',
  dark_mode: false,
  primary_color: '#3498db',
  accent_color: '#2ecc71',
  homepage_banner: 'Book your seats for the biggest matches!',
};

// Currency symbol map
const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF ',
  ALL: 'L',
};

// Language → locale map for Intl
const LANG_LOCALE = {
  en: 'en-GB',
  sq: 'sq-AL',
  de: 'de-DE',
  fr: 'fr-FR',
  it: 'it-IT',
  es: 'es-ES',
};

// Safe default object returned when used outside provider
const _makeSafeDefaults = () => ({
  settings: DEFAULTS,
  loaded: false,
  refreshSettings: () => {},
  formatPrice: (amount) => `€${Number(amount ?? 0).toFixed(2)}`,
  currencySymbol: '€',
  isDark: false,
  maxTicketsPerOrder: 10,
  taxRate: 0,
  currency: 'EUR',
  language: 'en',
  refundEnabled: true,
});
const _SAFE_DEFAULTS = _makeSafeDefaults();

// Helper: check if the current user is admin without importing AuthContext
// (avoids circular dependency — AuthContext sets user in localStorage on login)
const isAdminUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return false;
    const user = JSON.parse(raw);
    // AuthContext stores user with roles: ['admin', ...] array
    if (Array.isArray(user?.roles)) return user.roles.includes('admin');
    // Fallback checks for other possible formats
    if (typeof user?.role === 'string') return user.role === 'admin';
    return false;
  } catch {
    return false;
  }
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      // If we are logged in as admin, fetch all settings including secrets.
      // Otherwise, fetch public settings.
      const endpoint = (token && isAdminUser()) ? '/admin/settings' : '/settings';

      // api interceptor returns response.data directly
      // res = { success: true, data: { key: value, ... } }
      const res = await api.get(endpoint);
      const raw = res?.data ?? res;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        setSettings({ ...DEFAULTS, ...raw });
      }
    } catch (err) {
      // Silently fall back to defaults
      // This is intentional — if backend is down or user lost access,
      // the rest of the app should still work fine
      console.debug('[SettingsContext] Could not load settings, using defaults:', err?.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Reload when user logs in/out (token changes)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          // Small delay to let localStorage['user'] be set first
          setTimeout(() => loadSettings(), 100);
        } else {
          setSettings(DEFAULTS);
          setLoaded(true);
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [loadSettings]);

  // Format a price with current currency + locale
  const formatPrice = useCallback((amount, options = {}) => {
    const currency = settings.default_currency || 'EUR';
    const locale = LANG_LOCALE[settings.language] || 'en-GB';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options,
      }).format(amount ?? 0);
    } catch {
      const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
      return `${sym}${Number(amount ?? 0).toFixed(2)}`;
    }
  }, [settings.default_currency, settings.language]);

  // Currency symbol only
  const currencySymbol = CURRENCY_SYMBOLS[settings.default_currency] || settings.default_currency;

  // Apply dark mode + color vars to <html> whenever they change
  useEffect(() => {
    if (settings.dark_mode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.style.backgroundColor = '#1a1a2e';
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.style.backgroundColor = '';
    }
    document.documentElement.style.setProperty('--primary-color', settings.primary_color || '#3498db');
    document.documentElement.style.setProperty('--accent-color', settings.accent_color || '#2ecc71');
  }, [settings.dark_mode, settings.primary_color, settings.accent_color]);

  // Apply lang attribute to <html>
  useEffect(() => {
    document.documentElement.lang = settings.language || 'en';
  }, [settings.language]);

  const value = {
    settings,
    loaded,
    refreshSettings: loadSettings,
    formatPrice,
    currencySymbol,
    isDark: !!settings.dark_mode,
    maxTicketsPerOrder: Number(settings.max_tickets_per_order) || 10,
    taxRate: Number(settings.tax_rate) || 0,
    currency: settings.default_currency || 'EUR',
    language: settings.language || 'en',
    refundEnabled: !!settings.refund_enabled,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export default SettingsContext;
