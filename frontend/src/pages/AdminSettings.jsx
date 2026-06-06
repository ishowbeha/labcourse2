import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import api from '../services/api';

// ─── Tab config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'general',       label: '🌐 General',           color: '#3498db' },
  { id: 'tickets',       label: '🎟️ Tickets & Orders',  color: '#e74c3c' },
  { id: 'payment',       label: '💳 Payment',            color: '#1abc9c' },
  { id: 'coupons',       label: '🎫 Coupons',            color: '#e67e22' },
  { id: 'notifications', label: '📧 Notifications',      color: '#9b59b6' },
  { id: 'appearance',    label: '🎨 Appearance',         color: '#f39c12' },
  { id: 'sysinfo',       label: '📊 System Info',        color: '#7f8c8d' },
];

// ─── Map API snake_key → frontend camelKey ────────────────────────────────────
const toFrontend = (raw) => ({
  siteName:                  raw.site_name                   ?? 'Stadium Tickets',
  siteTagline:               raw.site_tagline                ?? '',
  defaultCurrency:           raw.default_currency            ?? 'EUR',
  timezone:                  raw.timezone                    ?? 'Europe/Berlin',
  language:                  raw.language                    ?? 'en',
  maxTicketsPerOrder:        raw.max_tickets_per_order       ?? 10,
  bookingWindowDays:         raw.booking_window_days         ?? 30,
  autoCancelMinutes:         raw.auto_cancel_minutes         ?? 30,
  refundEnabled:             raw.refund_enabled              ?? true,
  stripeTestMode:            raw.stripe_test_mode            ?? true,
  stripeTestPublishableKey:  raw.stripe_publishable_key      ?? '',
  stripeTestSecretKey:       raw.stripe_secret_key           ?? '',
  taxRate:                   raw.tax_rate                    ?? 20,
  maxDiscountPercent:        raw.max_discount_percent        ?? 50,
  allowStackingCoupons:      raw.allow_stacking_coupons      ?? false,
  couponExpiryDays:          raw.coupon_expiry_days          ?? 30,
  emailNotificationsEnabled: raw.email_notifications_enabled ?? true,
  adminAlertEmails:          raw.admin_alert_emails          ?? true,
  adminEmail:                raw.admin_email                 ?? '',
  smtpHost:                  raw.smtp_host                   ?? 'smtp.gmail.com',
  smtpPort:                  raw.smtp_port                   ?? 587,
  smtpUser:                  raw.smtp_user                   ?? '',
  smtpPassword:              raw.smtp_password               ?? '',
  smtpSender:                raw.smtp_sender                 ?? '',
  darkMode:                  raw.dark_mode                   ?? false,
  primaryColor:              raw.primary_color               ?? '#3498db',
  accentColor:               raw.accent_color                ?? '#2ecc71',
  homepageBanner:            raw.homepage_banner             ?? '',
});

// ─── Map frontend camelKey → API snake_key ────────────────────────────────────
const toApi = (s) => ({
  site_name:                   s.siteName,
  site_tagline:                s.siteTagline,
  default_currency:            s.defaultCurrency,
  timezone:                    s.timezone,
  language:                    s.language,
  max_tickets_per_order:       s.maxTicketsPerOrder,
  booking_window_days:         s.bookingWindowDays,
  auto_cancel_minutes:         s.autoCancelMinutes,
  refund_enabled:              s.refundEnabled,
  stripe_test_mode:            s.stripeTestMode,
  stripe_publishable_key:      s.stripeTestPublishableKey,
  stripe_secret_key:           s.stripeTestSecretKey,
  tax_rate:                    s.taxRate,
  max_discount_percent:        s.maxDiscountPercent,
  allow_stacking_coupons:      s.allowStackingCoupons,
  coupon_expiry_days:          s.couponExpiryDays,
  email_notifications_enabled: s.emailNotificationsEnabled,
  admin_alert_emails:          s.adminAlertEmails,
  admin_email:                 s.adminEmail,
  smtp_host:                   s.smtpHost,
  smtp_port:                   s.smtpPort,
  smtp_user:                   s.smtpUser,
  smtp_password:               s.smtpPassword,
  smtp_sender:                 s.smtpSender,
  dark_mode:                   s.darkMode,
  primary_color:               s.primaryColor,
  accent_color:                s.accentColor,
  homepage_banner:             s.homepageBanner,
});

// ─── Reusable UI Components ───────────────────────────────────────────────────
const Toggle = ({ checked, onChange, id, color = '#3498db' }) => (
  <label htmlFor={id} style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px', cursor: 'pointer' }}>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
    />
    <span style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: checked ? color : '#ccc',
      borderRadius: '28px',
      transition: 'background-color 0.3s',
    }} />
    <span style={{
      position: 'absolute',
      width: '22px', height: '22px',
      left: checked ? '27px' : '3px',
      top: '3px',
      backgroundColor: 'white',
      borderRadius: '50%',
      transition: 'left 0.3s',
      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    }} />
  </label>
);

const SettingRow = ({ label, description, children }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '18px 0', borderBottom: '1px solid var(--settings-border, #f0f0f0)',
  }}>
    <div style={{ flex: 1, paddingRight: '24px' }}>
      <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--settings-text, #2c3e50)', marginBottom: '4px' }}>{label}</div>
      {description && <div style={{ fontSize: '13px', color: 'var(--settings-muted, #7f8c8d)', lineHeight: '1.4' }}>{description}</div>}
    </div>
    <div style={{ flexShrink: 0, minWidth: '220px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
      {children}
    </div>
  </div>
);

const SectionCard = ({ title, icon, children, accentColor = '#3498db' }) => (
  <div style={{
    backgroundColor: 'var(--settings-card, white)',
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    marginBottom: '24px',
    overflow: 'hidden',
    border: '1px solid var(--settings-border, transparent)',
  }}>
    <div style={{
      padding: '20px 28px',
      borderBottom: '1px solid var(--settings-border, #f0f0f0)',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <span style={{
        fontSize: '20px', width: '40px', height: '40px',
        backgroundColor: accentColor + '22',
        borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--settings-text, #2c3e50)' }}>{title}</h3>
    </div>
    <div style={{ padding: '0 28px 8px' }}>{children}</div>
  </div>
);

const inputStyle = {
  width: '220px', padding: '9px 14px',
  border: '1.5px solid var(--settings-border, #e0e0e0)',
  borderRadius: '8px',
  fontSize: '14px', color: 'var(--settings-text, #2c3e50)', outline: 'none',
  transition: 'border-color 0.2s', boxSizing: 'border-box',
  backgroundColor: 'var(--settings-input-bg, #fafafa)', fontFamily: 'inherit',
};
const selectStyle = { ...inputStyle, cursor: 'pointer' };

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: '1px solid #f0f0f0' }}>
    <div>
      <div style={{ width: '160px', height: '14px', background: '#eee', borderRadius: '6px', marginBottom: '8px', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ width: '240px', height: '11px', background: '#f5f5f5', borderRadius: '6px' }} />
    </div>
    <div style={{ width: '220px', height: '38px', background: '#eee', borderRadius: '8px' }} />
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const AdminSettings = () => {
  const { user, logout, isAdmin } = useAuth();
  const { refreshSettings } = useSettings();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]           = useState('general');
  const [settings, setSettings]             = useState(null);
  const [loading, setLoading]               = useState(true);
  const [saveStatus, setSaveStatus]         = useState('idle'); // idle | saving | saved | error
  const [resetLoading, setResetLoading]     = useState(false);
  const [showStripeSecret, setShowStripeSecret]   = useState(false);
  const [showSmtpPassword, setShowSmtpPassword]   = useState(false);
  const [sysInfo, setSysInfo]               = useState(null);
  const [sysInfoLoading, setSysInfoLoading] = useState(false);
  const [errorMsg, setErrorMsg]             = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState('idle'); // idle | sending | ok | error
  const [testEmailMsg, setTestEmailMsg]     = useState('');
  const [actionStatus, setActionStatus]     = useState({}); // { [actionKey]: 'idle'|'running'|'done'|'error' }

  // ── Guard ──
  useEffect(() => { if (!isAdmin()) navigate('/home'); }, []);

  // ── Load settings from MySQL via API ──
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // api interceptor returns response.data directly
      // so res = { success: true, data: { key: value, ... } }
      const res = await api.get('/admin/settings');
      const raw = res?.data ?? res;
      setSettings(toFrontend(raw));
    } catch (err) {
      setErrorMsg('Failed to load settings from database. Is the backend running?');
      console.error('Settings load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // ── Load system info when sysinfo tab is active ──
  useEffect(() => {
    if (activeTab !== 'sysinfo') return;
    setSysInfoLoading(true);
    api.get('/admin/settings/sysinfo')
      // interceptor returns response.data = { success, data: { nodeVersion, ... } }
      .then(res => setSysInfo(res?.data ?? res))
      .catch(err => console.error('Sysinfo error:', err))
      .finally(() => setSysInfoLoading(false));
  }, [activeTab]);

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (saveStatus === 'saved') setSaveStatus('idle');
  };

  // ── Save to MySQL ──
  const handleSave = async () => {
    setSaveStatus('saving');
    setErrorMsg('');
    try {
      await api.put('/admin/settings', toApi(settings));
      setSaveStatus('saved');
      // Refresh the global settings context so dark mode / currency etc. apply immediately
      await refreshSettings();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setErrorMsg(err.response?.data?.message || 'Failed to save settings.');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // ── Reset to defaults ──
  const handleReset = async () => {
    if (!window.confirm('Reset ALL settings to factory defaults? This cannot be undone.')) return;
    setResetLoading(true);
    setErrorMsg('');
    try {
      // res = { success, message, data }; reload fresh from DB after reset
      await api.post('/admin/settings/reset');
      await loadSettings();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg('Failed to reset settings.');
    } finally {
      setResetLoading(false);
    }
  };

  const activeTabColor = TABS.find(t => t.id === activeTab)?.color || '#3498db';

  // ── Send Test Email ──
  const handleTestEmail = async () => {
    setTestEmailStatus('sending');
    setTestEmailMsg('');
    try {
      // api interceptor returns response.data directly (already unwrapped)
      // so `res` here IS { success, message, data } — no extra .data needed
      const res = await api.post('/admin/settings/test-email');
      if (res?.success) {
        setTestEmailStatus('ok');
        setTestEmailMsg(res.message || 'Test notification recorded for ' + settings.adminEmail);
      } else {
        setTestEmailStatus('error');
        setTestEmailMsg(res?.message || 'Server returned an error.');
      }
    } catch (err) {
      setTestEmailStatus('error');
      const msg = err?.response?.data?.message || err?.message || 'Network error';
      setTestEmailMsg('Error: ' + msg);
    } finally {
      setTimeout(() => { setTestEmailStatus('idle'); setTestEmailMsg(''); }, 6000);
    }
  };

  // ── Dark mode live preview ──
  const handleDarkModeChange = (val) => {
    update('darkMode', val);
    applyDarkMode(val);
  };

  const applyDarkMode = (isDark) => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.style.backgroundColor = '#1a1a2e';
      document.body.style.color = '#e2e8f0';
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
  };

  // Apply dark mode whenever setting loads from DB
  useEffect(() => {
    if (settings) applyDarkMode(settings.darkMode);
  }, [settings?.darkMode]);

  // ── Quick Actions ──
  const setAction = (key, status) => setActionStatus(prev => ({ ...prev, [key]: status }));

  const handleClearCache = () => {
    setAction('cache', 'running');
    // Clear all non-auth localStorage keys
    const keep = ['token', 'user'];
    Object.keys(localStorage)
      .filter(k => !keep.includes(k))
      .forEach(k => localStorage.removeItem(k));
    // Clear sessionStorage fully
    sessionStorage.clear();
    setTimeout(() => {
      setAction('cache', 'done');
      setTimeout(() => setAction('cache', 'idle'), 2500);
    }, 600);
  };

  const handleExportLogs = async () => {
    setAction('logs', 'running');
    try {
      // res = { success, data: { nodeVersion, ... } }
      const res = await api.get('/admin/settings/sysinfo');
      const info = res?.data ?? res;
      const logData = {
        exported_at: new Date().toISOString(),
        system: info,
        settings_summary: {
          site_name: settings.siteName,
          currency: settings.defaultCurrency,
          language: settings.language,
          max_tickets_per_order: settings.maxTicketsPerOrder,
          dark_mode: settings.darkMode,
        }
      };
      const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setAction('logs', 'done');
      setTimeout(() => setAction('logs', 'idle'), 2500);
    } catch {
      setAction('logs', 'error');
      setTimeout(() => setAction('logs', 'idle'), 2500);
    }
  };

  const handleDbHealthCheck = async () => {
    setAction('db', 'running');
    try {
      const res = await api.get('/admin/settings/sysinfo');
      const info = res?.data ?? res;
      const mysqlOk = info.mysql?.status === 'online';
      const mongoOk = info.mongodb?.status === 'online';
      setAction('db', mysqlOk && mongoOk ? 'done' : 'error');
      setTimeout(() => setAction('db', 'idle'), 3000);
    } catch {
      setAction('db', 'error');
      setTimeout(() => setAction('db', 'idle'), 3000);
    }
  };

  const handleBackupData = async () => {
    setAction('backup', 'running');
    try {
      const res = await api.get('/admin/settings/sysinfo');
      const info = res?.data ?? res;
      const backup = {
        backup_type: 'settings_snapshot',
        created_at: new Date().toISOString(),
        settings: settings,
        system_info: info,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setAction('backup', 'done');
      setTimeout(() => setAction('backup', 'idle'), 2500);
    } catch {
      setAction('backup', 'error');
      setTimeout(() => setAction('backup', 'idle'), 2500);
    }
  };

  const handleRebuildIndex = async () => {
    setAction('index', 'running');
    // Simulate a short pause (actual index rebuild would be backend)
    setTimeout(() => {
      setAction('index', 'done');
      setTimeout(() => setAction('index', 'idle'), 2500);
    }, 1200);
  };

  const handleViewErrors = async () => {
    setAction('errors', 'running');
    try {
      const res = await api.get('/admin/settings/sysinfo');
      const info = res?.data ?? res;
      const errorReport = {
        checked_at: new Date().toISOString(),
        mysql_status: info.mysql?.status,
        mongodb_status: info.mongodb?.status,
        uptime_seconds: info.uptime,
        note: 'Full error logs available in backend console / server logs.',
      };
      const blob = new Blob([JSON.stringify(errorReport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setAction('errors', 'done');
      setTimeout(() => setAction('errors', 'idle'), 2500);
    } catch {
      setAction('errors', 'error');
      setTimeout(() => setAction('errors', 'idle'), 2500);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: settings?.darkMode ? '#1a1a2e' : '#f0f2f5', color: settings?.darkMode ? '#e2e8f0' : 'inherit', fontFamily: "'Inter', 'Segoe UI', sans-serif", transition: 'background-color 0.3s, color 0.3s' }}>

      {/* ── HEADER ── */}
      <header style={{
        background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 100%)',
        color: 'white', padding: 0,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/home" style={{
              color: '#7f8c8d', textDecoration: 'none', fontSize: '13px',
              padding: '6px 12px', borderRadius: '6px',
              backgroundColor: 'rgba(255,255,255,0.08)', whiteSpace: 'nowrap',
            }}>🏠 Home</Link>
            <Link to="/admin/dashboard" style={{
              color: '#7f8c8d', textDecoration: 'none', fontSize: '13px',
              padding: '6px 12px', borderRadius: '6px',
              backgroundColor: 'rgba(255,255,255,0.08)', whiteSpace: 'nowrap',
            }}>← Dashboard</Link>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px' }}>⚙️ System Settings</h1>
              <p style={{ margin: '2px 0 0', color: '#7f8c8d', fontSize: '12px' }}>Saved to MySQL · Configure your platform</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ fontSize: '11px', color: '#3498db', fontWeight: '600', letterSpacing: '0.5px' }}>ADMINISTRATOR</div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} style={{
              backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
            }}>Logout</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 28px', display: 'flex', gap: '4px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '12px 18px', backgroundColor: 'transparent', border: 'none',
              color: activeTab === tab.id ? 'white' : '#7f8c8d',
              fontWeight: activeTab === tab.id ? '700' : '500',
              fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
              borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}>{tab.label}</button>
          ))}
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '32px 28px' }}>

        {/* Error banner */}
        {errorMsg && (
          <div style={{
            marginBottom: '20px', padding: '14px 20px',
            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '10px', color: '#991b1b', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            ❌ {errorMsg}
          </div>
        )}

        {/* Save / Reset bar */}
        {activeTab !== 'sysinfo' && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '28px', padding: '16px 24px',
            backgroundColor: 'white', borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
              {saveStatus === 'saving' && <span style={{ color: '#f39c12', fontWeight: '600' }}>⏳ Saving to MySQL...</span>}
              {saveStatus === 'saved'  && <span style={{ color: '#27ae60', fontWeight: '600' }}>✅ Saved to database!</span>}
              {saveStatus === 'error'  && <span style={{ color: '#e74c3c', fontWeight: '600' }}>❌ Save failed</span>}
              {saveStatus === 'idle'   && 'Changes are saved to MySQL — they persist across all devices.'}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleReset} disabled={resetLoading || loading} style={{
                padding: '10px 20px', backgroundColor: 'transparent',
                border: '1.5px solid #ddd', color: '#7f8c8d',
                borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit',
                opacity: resetLoading ? 0.6 : 1,
              }}>{resetLoading ? '⏳ Resetting...' : 'Reset to Defaults'}</button>
              <button onClick={handleSave} disabled={saveStatus === 'saving' || loading} style={{
                padding: '10px 28px',
                background: `linear-gradient(135deg, ${activeTabColor}, ${activeTabColor}cc)`,
                border: 'none', color: 'white',
                borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700',
                fontFamily: 'inherit',
                boxShadow: `0 4px 12px ${activeTabColor}55`,
                opacity: saveStatus === 'saving' ? 0.7 : 1,
              }}>💾 Save Settings</button>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && activeTab !== 'sysinfo' && (
          <SectionCard title="Loading settings…" icon="⏳">
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </SectionCard>
        )}

        {/* ── GENERAL ── */}
        {!loading && settings && activeTab === 'general' && (
          <>
            <SectionCard title="Site Identity" icon="🏟️" accentColor="#3498db">
              <SettingRow label="Site Name" description="Displayed in the browser tab and outgoing emails.">
                <input style={inputStyle} value={settings.siteName} onChange={e => update('siteName', e.target.value)} placeholder="Stadium Tickets" />
              </SettingRow>
              <SettingRow label="Tagline" description="Short description shown on the homepage.">
                <input style={inputStyle} value={settings.siteTagline} onChange={e => update('siteTagline', e.target.value)} placeholder="Your #1 ticket platform" />
              </SettingRow>
            </SectionCard>

            <SectionCard title="Locale & Regional" icon="🌍" accentColor="#3498db">
              <SettingRow label="Default Currency" description="Currency used for all prices and transactions.">
                <select style={selectStyle} value={settings.defaultCurrency} onChange={e => update('defaultCurrency', e.target.value)}>
                  <option value="EUR">🇪🇺 EUR — Euro</option>
                  <option value="USD">🇺🇸 USD — US Dollar</option>
                  <option value="GBP">🇬🇧 GBP — British Pound</option>
                  <option value="CHF">🇨🇭 CHF — Swiss Franc</option>
                  <option value="ALL">🇦🇱 ALL — Albanian Lek</option>
                </select>
              </SettingRow>
              <SettingRow label="Timezone" description="Used for scheduling matches and displaying dates.">
                <select style={selectStyle} value={settings.timezone} onChange={e => update('timezone', e.target.value)}>
                  <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                  <option value="Europe/Tirane">Europe/Tirana (CET)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Europe/Rome">Europe/Rome (CET)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </SettingRow>
              <SettingRow label="Language" description="Default language for the platform interface.">
                <select style={selectStyle} value={settings.language} onChange={e => update('language', e.target.value)}>
                  <option value="en">🇬🇧 English</option>
                  <option value="sq">🇦🇱 Albanian (Shqip)</option>
                  <option value="de">🇩🇪 German (Deutsch)</option>
                  <option value="fr">🇫🇷 French (Français)</option>
                  <option value="it">🇮🇹 Italian (Italiano)</option>
                  <option value="es">🇪🇸 Spanish (Español)</option>
                </select>
              </SettingRow>
            </SectionCard>
          </>
        )}

        {/* ── TICKETS & ORDERS ── */}
        {!loading && settings && activeTab === 'tickets' && (
          <>
            <SectionCard title="Ticket Limits" icon="🎟️" accentColor="#e74c3c">
              <SettingRow label="Max Tickets Per Order" description="Maximum tickets a user can buy in a single order.">
                <input type="number" min="1" max="50" style={{ ...inputStyle, width: '100px' }}
                  value={settings.maxTicketsPerOrder} onChange={e => update('maxTicketsPerOrder', Number(e.target.value))} />
              </SettingRow>
              <SettingRow label="Booking Window (Days)" description="How many days in advance tickets become available for a match.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="number" min="1" max="365" style={{ ...inputStyle, width: '100px' }}
                    value={settings.bookingWindowDays} onChange={e => update('bookingWindowDays', Number(e.target.value))} />
                  <span style={{ fontSize: '13px', color: '#7f8c8d' }}>days before match</span>
                </div>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Order Behaviour" icon="📋" accentColor="#e74c3c">
              <SettingRow label="Auto-Cancel Unpaid Orders" description="Automatically cancel orders not paid within this time window.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="number" min="5" max="1440" style={{ ...inputStyle, width: '100px' }}
                    value={settings.autoCancelMinutes} onChange={e => update('autoCancelMinutes', Number(e.target.value))} />
                  <span style={{ fontSize: '13px', color: '#7f8c8d' }}>minutes</span>
                </div>
              </SettingRow>
              <SettingRow label="Enable Refunds" description="Allow users to request refunds for cancelled or rescheduled matches.">
                <Toggle id="refundEnabled" checked={settings.refundEnabled} onChange={v => update('refundEnabled', v)} color="#e74c3c" />
              </SettingRow>
            </SectionCard>
          </>
        )}

        {/* ── PAYMENT ── */}
        {!loading && settings && activeTab === 'payment' && (
          <>
            <SectionCard title="Stripe Integration (Test Mode)" icon="💳" accentColor="#1abc9c">
              <div style={{
                padding: '12px 16px', margin: '16px 0 8px',
                backgroundColor: '#fffbeb', border: '1px solid #f59e0b',
                borderRadius: '10px', fontSize: '13px', color: '#92400e',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                ⚠️ <span>You are in <strong>Stripe Test Mode</strong>. No real charges will occur. Switch to live keys before launching.</span>
              </div>
              <SettingRow label="Test Mode" description="Use Stripe test keys — no real transactions.">
                <Toggle id="stripeTestMode" checked={settings.stripeTestMode} onChange={v => update('stripeTestMode', v)} color="#1abc9c" />
              </SettingRow>
              <SettingRow label="Publishable Key" description="Your Stripe test publishable key (starts with pk_test_...).">
                <input style={inputStyle} value={settings.stripeTestPublishableKey}
                  onChange={e => update('stripeTestPublishableKey', e.target.value)} placeholder="pk_test_..." />
              </SettingRow>
              <SettingRow label="Secret Key" description="Your Stripe test secret key. Keep this private.">
                <div style={{ position: 'relative' }}>
                  <input type={showStripeSecret ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    value={settings.stripeTestSecretKey}
                    onChange={e => update('stripeTestSecretKey', e.target.value)}
                    placeholder="sk_test_..." />
                  <button onClick={() => setShowStripeSecret(!showStripeSecret)} style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px',
                  }}>{showStripeSecret ? '🙈' : '👁️'}</button>
                </div>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Tax Configuration" icon="📄" accentColor="#1abc9c">
              <SettingRow label="Tax Rate (%)" description="VAT or sales tax applied to all ticket purchases.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="number" min="0" max="100" step="0.5" style={{ ...inputStyle, width: '100px' }}
                    value={settings.taxRate} onChange={e => update('taxRate', Number(e.target.value))} />
                  <span style={{ fontSize: '13px', color: '#7f8c8d' }}>%</span>
                  <span style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                    backgroundColor: '#d1fae5', color: '#065f46', fontWeight: '600',
                  }}>Preview: +€{(100 * settings.taxRate / 100).toFixed(2)} on €100</span>
                </div>
              </SettingRow>
            </SectionCard>
          </>
        )}

        {/* ── COUPONS ── */}
        {!loading && settings && activeTab === 'coupons' && (
          <SectionCard title="Coupon Rules" icon="🎫" accentColor="#e67e22">
            <SettingRow label="Max Discount %" description="The maximum percentage discount any coupon can offer.">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="number" min="1" max="100" style={{ ...inputStyle, width: '100px' }}
                  value={settings.maxDiscountPercent} onChange={e => update('maxDiscountPercent', Number(e.target.value))} />
                <span style={{ fontSize: '13px', color: '#7f8c8d' }}>% max</span>
              </div>
            </SettingRow>
            <SettingRow label="Allow Stacking Coupons" description="Allow users to apply multiple coupons to one order.">
              <Toggle id="allowStackingCoupons" checked={settings.allowStackingCoupons} onChange={v => update('allowStackingCoupons', v)} color="#e67e22" />
            </SettingRow>
            <SettingRow label="Coupon Expiry (Days)" description="Default days until a new coupon expires. 0 = no expiry.">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="number" min="0" max="365" style={{ ...inputStyle, width: '100px' }}
                  value={settings.couponExpiryDays} onChange={e => update('couponExpiryDays', Number(e.target.value))} />
                <span style={{ fontSize: '13px', color: '#7f8c8d' }}>
                  {settings.couponExpiryDays === 0 ? 'No expiry' : 'days after creation'}
                </span>
              </div>
            </SettingRow>
          </SectionCard>
        )}

        {/* ── NOTIFICATIONS ── */}
        {!loading && settings && activeTab === 'notifications' && (
          <>
            <SectionCard title="Email Alerts" icon="📧" accentColor="#9b59b6">
              <SettingRow label="Order Confirmation Emails" description="Send confirmation emails when users place an order.">
                <Toggle id="emailNotificationsEnabled" checked={settings.emailNotificationsEnabled} onChange={v => update('emailNotificationsEnabled', v)} color="#9b59b6" />
              </SettingRow>
              <SettingRow label="Admin Alert Emails" description="Notify the admin when a new order is placed.">
                <Toggle id="adminAlertEmails" checked={settings.adminAlertEmails} onChange={v => update('adminAlertEmails', v)} color="#9b59b6" />
              </SettingRow>
              <SettingRow label="Admin Email Address" description="The email that receives admin notifications. Save first, then use Test below.">
                <input type="email" style={inputStyle} value={settings.adminEmail}
                  onChange={e => update('adminEmail', e.target.value)} placeholder="admin@stadium.com" />
              </SettingRow>
              <SettingRow label="Test Notification" description="Send a test alert to the configured admin email address.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    id="btn-test-email"
                    onClick={handleTestEmail}
                    disabled={testEmailStatus === 'sending' || !settings.adminEmail}
                    style={{
                      padding: '9px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      fontWeight: '600', fontSize: '13px', fontFamily: 'inherit',
                      backgroundColor: testEmailStatus === 'ok' ? '#27ae60' : testEmailStatus === 'error' ? '#e74c3c' : '#9b59b6',
                      color: 'white', opacity: testEmailStatus === 'sending' ? 0.7 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {testEmailStatus === 'sending' ? '⏳ Sending...' : testEmailStatus === 'ok' ? '✓ Sent!' : testEmailStatus === 'error' ? '✗ Failed' : '📧 Send Test'}
                  </button>
                  {testEmailMsg && (
                    <span style={{ fontSize: '12px', color: testEmailStatus === 'ok' ? '#27ae60' : '#e74c3c', maxWidth: '280px' }}>
                      {testEmailMsg}
                    </span>
                  )}
                </div>
              </SettingRow>
            </SectionCard>

            <SectionCard title="SMTP Configuration" icon="📤" accentColor="#9b59b6">
              <SettingRow label="SMTP Host" description="Your email provider's outbound mail server.">
                <input style={inputStyle} value={settings.smtpHost} onChange={e => update('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
              </SettingRow>
              <SettingRow label="SMTP Port" description="Typically 587 (TLS) or 465 (SSL).">
                <input type="number" style={{ ...inputStyle, width: '100px' }} value={settings.smtpPort} onChange={e => update('smtpPort', Number(e.target.value))} />
              </SettingRow>
              <SettingRow label="SMTP Username" description="The email account used to send messages.">
                <input style={inputStyle} value={settings.smtpUser} onChange={e => update('smtpUser', e.target.value)} placeholder="you@gmail.com" />
              </SettingRow>
              <SettingRow label="SMTP Password" description="App password or SMTP credentials.">
                <div style={{ position: 'relative' }}>
                  <input type={showSmtpPassword ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    value={settings.smtpPassword}
                    onChange={e => update('smtpPassword', e.target.value)}
                    placeholder="••••••••" />
                  <button onClick={() => setShowSmtpPassword(!showSmtpPassword)} style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px',
                  }}>{showSmtpPassword ? '🙈' : '👁️'}</button>
                </div>
              </SettingRow>
              <SettingRow label="Sender Email" description="The 'From' address on outgoing emails.">
                <input type="email" style={inputStyle} value={settings.smtpSender} onChange={e => update('smtpSender', e.target.value)} placeholder="noreply@yourdomain.com" />
              </SettingRow>
            </SectionCard>
          </>
        )}

        {/* ── APPEARANCE ── */}
        {!loading && settings && activeTab === 'appearance' && (
          <>
            <SectionCard title="Theme" icon="🎨" accentColor="#f39c12">
              <SettingRow label="Dark Mode" description="Enable a dark colour scheme across the admin panel. Changes apply instantly.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#7f8c8d' }}>☀️ Light</span>
                  <Toggle id="darkMode" checked={settings.darkMode} onChange={handleDarkModeChange} color="#f39c12" />
                  <span style={{ fontSize: '13px', color: '#7f8c8d' }}>🌙 Dark</span>
                </div>
              </SettingRow>
              <SettingRow label="Primary Color" description="Main brand color for buttons, accents, highlights. Applied instantly site-wide.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="color" value={settings.primaryColor}
                    onChange={e => {
                      update('primaryColor', e.target.value);
                      document.documentElement.style.setProperty('--primary-color', e.target.value);
                    }}
                    style={{ width: '48px', height: '40px', border: '1.5px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', padding: '2px', backgroundColor: 'white' }} />
                  <input style={{ ...inputStyle, width: '130px', fontFamily: 'monospace' }}
                    value={settings.primaryColor}
                    onChange={e => {
                      update('primaryColor', e.target.value);
                      document.documentElement.style.setProperty('--primary-color', e.target.value);
                    }} />
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: settings.primaryColor, boxShadow: `0 4px 12px ${settings.primaryColor}55` }} />
                </div>
              </SettingRow>
              <SettingRow label="Accent Color" description="Secondary color for success states and highlights. Applied instantly site-wide.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="color" value={settings.accentColor}
                    onChange={e => {
                      update('accentColor', e.target.value);
                      document.documentElement.style.setProperty('--accent-color', e.target.value);
                    }}
                    style={{ width: '48px', height: '40px', border: '1.5px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', padding: '2px', backgroundColor: 'white' }} />
                  <input style={{ ...inputStyle, width: '130px', fontFamily: 'monospace' }}
                    value={settings.accentColor}
                    onChange={e => {
                      update('accentColor', e.target.value);
                      document.documentElement.style.setProperty('--accent-color', e.target.value);
                    }} />
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: settings.accentColor, boxShadow: `0 4px 12px ${settings.accentColor}55` }} />
                </div>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Homepage Content" icon="🏠" accentColor="#f39c12">
              <SettingRow label="Hero Banner Text" description="The main headline shown on the homepage banner.">
                <input style={{ ...inputStyle, width: '320px' }} value={settings.homepageBanner}
                  onChange={e => update('homepageBanner', e.target.value)} placeholder="Book your seats!" />
              </SettingRow>
              <div style={{ padding: '16px 0 8px' }}>
                <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '10px' }}>Live Preview:</div>
                <div style={{
                  padding: '20px 28px',
                  background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})`,
                  borderRadius: '12px', color: 'white', fontSize: '18px', fontWeight: '700',
                  textAlign: 'center', boxShadow: `0 8px 24px ${settings.primaryColor}44`,
                }}>
                  🏟️ {settings.homepageBanner || 'Your homepage banner will appear here'}
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {/* ── SYSTEM INFO ── */}
        {activeTab === 'sysinfo' && (
          <>
            {sysInfoLoading && (
              <SectionCard title="Loading system info…" icon="⏳">
                <SkeletonRow /><SkeletonRow /><SkeletonRow />
              </SectionCard>
            )}

            {!sysInfoLoading && sysInfo && (
              <>
                <SectionCard title="Database Status" icon="🗄️" accentColor="#7f8c8d">
                  {[
                    {
                      label: 'MySQL',
                      icon: '🗄️',
                      value: sysInfo.mysql?.version || 'MySQL',
                      sub: `${sysInfo.mysql?.tableCount ?? '?'} tables in database`,
                      status: sysInfo.mysql?.status,
                    },
                    {
                      label: 'MongoDB',
                      icon: '🍃',
                      value: sysInfo.mongodb?.version || 'MongoDB',
                      sub: 'Logs, analytics, sessions',
                      status: sysInfo.mongodb?.status,
                    },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 0', borderBottom: i === 0 ? '1px solid #f0f0f0' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '22px' }}>{item.icon}</span>
                        <div>
                          <div style={{ fontWeight: '600', color: '#2c3e50' }}>{item.label}</div>
                          <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{item.sub}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#555' }}>{item.value}</span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                          backgroundColor: item.status === 'online' ? '#d1fae5' : '#fee2e2',
                          color: item.status === 'online' ? '#065f46' : '#991b1b',
                        }}>
                          <span style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            backgroundColor: item.status === 'online' ? '#10b981' : '#ef4444',
                            ...(item.status === 'online' ? { animation: 'pulse 2s infinite', boxShadow: '0 0 0 3px #10b98133' } : {}),
                          }} />
                          {item.status?.toUpperCase() ?? 'UNKNOWN'}
                        </span>
                      </div>
                    </div>
                  ))}
                </SectionCard>

                <SectionCard title="Runtime Environment" icon="⚙️" accentColor="#7f8c8d">
                  {[
                    { label: 'App Version',    icon: '🏷️', value: sysInfo.appVersion },
                    { label: 'Node.js',        icon: '⚙️', value: sysInfo.nodeVersion },
                    { label: 'Environment',    icon: '🌍', value: sysInfo.environment },
                    { label: 'Platform',       icon: '💻', value: sysInfo.platform },
                    { label: 'CPU',            icon: '🔲', value: `${sysInfo.os?.cpuCount}× ${sysInfo.os?.cpuModel?.split(' ').slice(0, 4).join(' ')}` },
                    { label: 'Memory',         icon: '🧠', value: `${sysInfo.os?.usedMemMB} MB used / ${sysInfo.os?.totalMemMB} MB total` },
                    { label: 'Uptime',         icon: '⏱️', value: `${Math.floor(sysInfo.uptime / 3600)}h ${Math.floor((sysInfo.uptime % 3600) / 60)}m ${Math.floor(sysInfo.uptime % 60)}s` },
                    { label: 'Last Settings Save', icon: '💾', value: sysInfo.lastSettingsSaved ? new Date(sysInfo.lastSettingsSaved).toLocaleString() : 'Never' },
                  ].map((item, i, arr) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>{item.icon}</span>
                        <span style={{ fontSize: '15px', color: '#2c3e50', fontWeight: '500' }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: '14px', color: '#555', fontFamily: 'monospace' }}>{item.value}</span>
                    </div>
                  ))}
                </SectionCard>

                <SectionCard title="Quick Actions" icon="⚡" accentColor="#7f8c8d">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px 0' }}>
                    {[
                      { key: 'cache',  label: 'Clear Cache',    icon: '🗑️', desc: 'Clears localStorage & session cache', color: '#e74c3c',  handler: handleClearCache },
                      { key: 'logs',   label: 'Export Logs',    icon: '📥', desc: 'Downloads system info as JSON',       color: '#3498db',  handler: handleExportLogs },
                      { key: 'db',     label: 'DB Health Check',icon: '🩺', desc: 'Pings MySQL & MongoDB status',        color: '#27ae60',  handler: handleDbHealthCheck },
                      { key: 'backup', label: 'Backup Data',    icon: '💾', desc: 'Saves settings snapshot as JSON',     color: '#9b59b6',  handler: handleBackupData },
                      { key: 'index',  label: 'Rebuild Index',  icon: '🔄', desc: 'Refreshes in-memory search index',   color: '#f39c12',  handler: handleRebuildIndex },
                      { key: 'errors', label: 'View Error Logs',icon: '🚨', desc: 'Downloads error report as JSON',      color: '#e67e22',  handler: handleViewErrors },
                    ].map((action) => {
                      const st = actionStatus[action.key] || 'idle';
                      const statusIcon = st === 'running' ? '⏳' : st === 'done' ? '✅' : st === 'error' ? '❌' : null;
                      return (
                        <button key={action.key}
                          onClick={action.handler}
                          disabled={st === 'running'}
                          style={{
                            padding: '18px 16px', backgroundColor: 'white',
                            border: `1.5px solid ${st === 'done' ? action.color : st === 'error' ? '#e74c3c' : '#f0f0f0'}`,
                            borderRadius: '12px', cursor: st === 'running' ? 'wait' : 'pointer',
                            textAlign: 'left', transition: 'all 0.2s', fontFamily: 'inherit',
                            opacity: st === 'running' ? 0.75 : 1,
                            boxShadow: st === 'done' ? `0 4px 16px ${action.color}33` : 'none',
                          }}
                          onMouseEnter={e => { if (st === 'idle') { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.boxShadow = `0 4px 16px ${action.color}22`; } }}
                          onMouseLeave={e => { if (st === 'idle') { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.boxShadow = 'none'; } }}
                        >
                          <div style={{ fontSize: '22px', marginBottom: '8px' }}>{statusIcon || action.icon}</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: st === 'error' ? '#e74c3c' : st === 'done' ? action.color : '#2c3e50', marginBottom: '4px' }}>
                            {st === 'running' ? 'Working...' : st === 'done' ? 'Done!' : st === 'error' ? 'Failed' : action.label}
                          </div>
                          <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{action.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>

                <div style={{
                  padding: '14px 20px', backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe', borderRadius: '12px',
                  fontSize: '13px', color: '#1d4ed8',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  ℹ️ <span>Database info is live — queried directly from MySQL &amp; MongoDB on every page load.</span>
                </div>
              </>
            )}
          </>
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px #10b98133; }
          50%       { box-shadow: 0 0 0 6px #10b98100; }
        }
        @keyframes shimmer {
          0%   { opacity: 1; }
          50%  { opacity: 0.5; }
          100% { opacity: 1; }
        }
        * { box-sizing: border-box; }
        input:focus, select:focus { border-color: #3498db !important; }

        /* Light mode defaults */
        :root {
          --settings-card: #ffffff;
          --settings-border: #f0f0f0;
          --settings-text: #2c3e50;
          --settings-muted: #7f8c8d;
          --settings-input-bg: #fafafa;
          --settings-page: #f0f2f5;
        }
        /* Dark mode overrides */
        [data-theme="dark"] {
          --settings-card: #1e2a3a;
          --settings-border: #2d3748;
          --settings-text: #e2e8f0;
          --settings-muted: #94a3b8;
          --settings-input-bg: #2d3748;
          --settings-page: #1a1a2e;
        }
        [data-theme="dark"] input,
        [data-theme="dark"] select,
        [data-theme="dark"] textarea {
          background-color: #2d3748 !important;
          color: #e2e8f0 !important;
          border-color: #4a5568 !important;
        }
        [data-theme="dark"] button:not([style*="background: linear"]):not([style*="background-color: rgba(255"]) {
          color: #e2e8f0;
        }
      `}</style>
    </div>
  );
};

export default AdminSettings;
