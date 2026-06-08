import { create } from 'zustand';
import api from '../services/api';

export const DEFAULT_SETTINGS = {
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

const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF ',
  ALL: 'L',
};

const LANG_LOCALE = {
  en: 'en-GB',
  sq: 'sq-AL',
  de: 'de-DE',
  fr: 'fr-FR',
  it: 'it-IT',
  es: 'es-ES',
};

const isAdminUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return false;
    const user = JSON.parse(raw);
    if (Array.isArray(user?.roles)) return user.roles.includes('admin');
    if (typeof user?.role === 'string') return user.role === 'admin';
    return false;
  } catch {
    return false;
  }
};

const applyTheme = (settings) => {
  if (settings.dark_mode) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  document.body.style.backgroundColor = '';
  document.body.style.color = '';
  document.documentElement.style.setProperty('--primary-color', settings.primary_color || '#3498db');
  document.documentElement.style.setProperty('--accent-color', settings.accent_color || '#2ecc71');
  document.documentElement.lang = settings.language || 'en';
};



export const useSettingsStore = create((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = token && isAdminUser() ? '/admin/settings' : '/settings';
      const res = await api.get(endpoint);
      const raw = res?.data ?? res;

      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const merged = { ...DEFAULT_SETTINGS, ...raw };
        set({ settings: merged, loaded: true });
        applyTheme(merged);
        return;
      }
    } catch (err) {
      console.debug('[settingsStore] Could not load settings, using defaults:', err?.message);
    }

    set({ settings: DEFAULT_SETTINGS, loaded: true });
    applyTheme(DEFAULT_SETTINGS);
  },

  refreshSettings: async () => get().loadSettings(),

  resetToDefaults: () => {
    set({ settings: DEFAULT_SETTINGS, loaded: true });
    applyTheme(DEFAULT_SETTINGS);
  },

  formatPrice: (amount, options = {}) => {
    const { settings } = get();
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
      const sym = CURRENCY_SYMBOLS[currency] || `${currency} `;
      return `${sym}${Number(amount ?? 0).toFixed(2)}`;
    }
  },
}));

export const useSettings = () => {
  const store = useSettingsStore();
  const { settings, loaded, loadSettings, refreshSettings, formatPrice } = store;

  return {
    settings,
    loaded,
    refreshSettings,
    formatPrice,
    currencySymbol: CURRENCY_SYMBOLS[settings.default_currency] || settings.default_currency,
    isDark: !!settings.dark_mode,
    maxTicketsPerOrder: Number(settings.max_tickets_per_order) || 10,
    taxRate: Number(settings.tax_rate) || 0,
    currency: settings.default_currency || 'EUR',
    language: settings.language || 'en',
    refundEnabled: !!settings.refund_enabled,
  };
};
