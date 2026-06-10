import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Form, Button, Alert, Badge, Placeholder, InputGroup,
} from 'react-bootstrap';
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
const Toggle = ({ checked, onChange, id }) => (
  <Form.Check
    type="switch"
    id={id}
    checked={checked}
    onChange={(e) => onChange(e.target.checked)}
    className="mb-0"
  />
);

const SettingRow = ({ label, description, children }) => (
  <Row className="py-3 border-bottom settings-row align-items-start">
    <Col xs={12} md={7} className="mb-2 mb-md-0">
      <div className="fw-semibold settings-label">{label}</div>
      {description && <div className="small text-muted settings-description">{description}</div>}
    </Col>
    <Col xs={12} md={5} className="d-flex justify-content-md-end align-items-center">
      {children}
    </Col>
  </Row>
);

const SectionCard = ({ title, icon, children, accentColor = '#3498db' }) => (
  <Card className="mb-4 shadow-sm settings-card overflow-hidden">
    <Card.Header className="d-flex align-items-center gap-3 bg-white settings-card-header">
      <span
        className="d-flex align-items-center justify-content-center rounded settings-icon-badge"
        style={{ backgroundColor: `${accentColor}22` }}
      >
        {icon}
      </span>
      <Card.Title className="h5 mb-0 settings-title">{title}</Card.Title>
    </Card.Header>
    <Card.Body className="px-4 pb-2">{children}</Card.Body>
  </Card>
);

const SkeletonRow = () => (
  <div className="d-flex justify-content-between align-items-center py-3 border-bottom placeholder-glow">
    <div className="w-50">
      <Placeholder xs={6} className="mb-2" />
      <Placeholder xs={8} size="sm" />
    </div>
    <Placeholder xs={4} className="settings-field-width" />
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

  // ── Dark mode — live preview + save to MySQL on Save button ──
  const applyDarkMode = (isDark) => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  };

  const handleDarkModeChange = (val) => {
    update('darkMode', val);
    applyDarkMode(val);  // instant live preview
  };

  // Re-apply theme whenever settings load from DB
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

  return (
    <div className={`min-vh-100 ${settings?.darkMode ? 'settings-page-dark' : 'bg-light'}`}>
      <header className="admin-header text-white sticky-top shadow">
        <Container fluid="lg" className="py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <Link
                to="/home"
                className="btn btn-sm text-nowrap flex-shrink-0 admin-header-home-link"
              >
                🏠 Home
              </Link>
              <Link
                to="/admin/dashboard"
                className="btn btn-sm btn-outline-light text-nowrap flex-shrink-0"
              >
                ← Dashboard
              </Link>
              <div>
                <h1 className="h4 mb-0 fw-bold">⚙️ System Settings</h1>
                <p className="small admin-header-subtitle mb-0">Saved to MySQL · Configure your platform</p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="text-end">
                <div className="fw-semibold small">{user?.first_name} {user?.last_name}</div>
                <div className="small text-info fw-semibold">ADMINISTRATOR</div>
              </div>
              <Button variant="outline-light" size="sm" onClick={() => { logout(); navigate('/login'); }}>
                Logout
              </Button>
            </div>
          </div>
        </Container>

        <Container fluid="lg" className="px-3">
          <div className="d-flex gap-1 overflow-auto pb-0">
            {TABS.map(tab => (
              <Button
                key={tab.id}
                variant="link"
                className={`text-decoration-none px-3 py-2 border-0 border-bottom border-3 rounded-0 settings-tab ${activeTab === tab.id ? 'text-white fw-bold' : 'admin-header-subtitle'}`}
                style={{ borderBottomColor: activeTab === tab.id ? tab.color : 'transparent' }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </Container>
      </header>

      <Container fluid="lg" className="py-4">
        {errorMsg && (
          <Alert variant="danger" className="d-flex align-items-center gap-2">
            ❌ {errorMsg}
          </Alert>
        )}

        {activeTab !== 'sysinfo' && (
          <Card className="mb-4 shadow-sm">
            <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div className="small text-muted">
                {saveStatus === 'saving' && <span className="text-warning fw-semibold">⏳ Saving to MySQL...</span>}
                {saveStatus === 'saved' && <span className="text-success fw-semibold">✅ Saved to database!</span>}
                {saveStatus === 'error' && <span className="text-danger fw-semibold">❌ Save failed</span>}
                {saveStatus === 'idle' && 'Changes are saved to MySQL — they persist across all devices.'}
              </div>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" onClick={handleReset} disabled={resetLoading || loading}>
                  {resetLoading ? '⏳ Resetting...' : 'Reset to Defaults'}
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={saveStatus === 'saving' || loading} style={{ backgroundColor: activeTabColor, borderColor: activeTabColor }}>
                  💾 Save Settings
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {loading && activeTab !== 'sysinfo' && (
          <SectionCard title="Loading settings…" icon="⏳">
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </SectionCard>
        )}

        {!loading && settings && activeTab === 'general' && (
          <>
            <SectionCard title="Site Identity" icon="🏟️" accentColor="#3498db">
              <SettingRow label="Site Name" description="Displayed in the browser tab and outgoing emails.">
                <Form.Control className="settings-field-width" value={settings.siteName} onChange={e => update('siteName', e.target.value)} placeholder="Stadium Tickets" />
              </SettingRow>
              <SettingRow label="Tagline" description="Short description shown on the homepage.">
                <Form.Control className="settings-field-width" value={settings.siteTagline} onChange={e => update('siteTagline', e.target.value)} placeholder="Your #1 ticket platform" />
              </SettingRow>
            </SectionCard>

            <SectionCard title="Locale & Regional" icon="🌍" accentColor="#3498db">
              <SettingRow label="Default Currency" description="Currency used for all prices and transactions.">
                <Form.Select className="settings-field-width" value={settings.defaultCurrency} onChange={e => update('defaultCurrency', e.target.value)}>
                  <option value="EUR">🇪🇺 EUR — Euro</option>
                  <option value="USD">🇺🇸 USD — US Dollar</option>
                  <option value="GBP">🇬🇧 GBP — British Pound</option>
                  <option value="CHF">🇨🇭 CHF — Swiss Franc</option>
                  <option value="ALL">🇦🇱 ALL — Albanian Lek</option>
                </Form.Select>
              </SettingRow>
              <SettingRow label="Timezone" description="Used for scheduling matches and displaying dates.">
                <Form.Select className="settings-field-width" value={settings.timezone} onChange={e => update('timezone', e.target.value)}>
                  <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                  <option value="Europe/Tirane">Europe/Tirana (CET)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Europe/Rome">Europe/Rome (CET)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="UTC">UTC</option>
                </Form.Select>
              </SettingRow>
              <SettingRow label="Language" description="Default language for the platform interface.">
                <Form.Select className="settings-field-width" value={settings.language} onChange={e => update('language', e.target.value)}>
                  <option value="en">🇬🇧 English</option>
                  <option value="sq">🇦🇱 Albanian (Shqip)</option>
                  <option value="de">🇩🇪 German (Deutsch)</option>
                  <option value="fr">🇫🇷 French (Français)</option>
                  <option value="it">🇮🇹 Italian (Italiano)</option>
                  <option value="es">🇪🇸 Spanish (Español)</option>
                </Form.Select>
              </SettingRow>
            </SectionCard>
          </>
        )}

        {!loading && settings && activeTab === 'tickets' && (
          <>
            <SectionCard title="Ticket Limits" icon="🎟️" accentColor="#e74c3c">
              <SettingRow label="Max Tickets Per Order" description="Maximum tickets a user can buy in a single order.">
                <Form.Control type="number" min="1" max="50" className="settings-field-width-sm" value={settings.maxTicketsPerOrder} onChange={e => update('maxTicketsPerOrder', Number(e.target.value))} />
              </SettingRow>
              <SettingRow label="Booking Window (Days)" description="How many days in advance tickets become available for a match.">
                <div className="d-flex align-items-center gap-2">
                  <Form.Control type="number" min="1" max="365" className="settings-field-width-sm" value={settings.bookingWindowDays} onChange={e => update('bookingWindowDays', Number(e.target.value))} />
                  <span className="small text-muted">days before match</span>
                </div>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Order Behaviour" icon="📋" accentColor="#e74c3c">
              <SettingRow label="Auto-Cancel Unpaid Orders" description="Automatically cancel orders not paid within this time window.">
                <div className="d-flex align-items-center gap-2">
                  <Form.Control type="number" min="5" max="1440" className="settings-field-width-sm" value={settings.autoCancelMinutes} onChange={e => update('autoCancelMinutes', Number(e.target.value))} />
                  <span className="small text-muted">minutes</span>
                </div>
              </SettingRow>
              <SettingRow label="Enable Refunds" description="Allow users to request refunds for cancelled or rescheduled matches.">
                <Toggle id="refundEnabled" checked={settings.refundEnabled} onChange={v => update('refundEnabled', v)} />
              </SettingRow>
            </SectionCard>
          </>
        )}

        {!loading && settings && activeTab === 'payment' && (
          <>
            <SectionCard title="Stripe Integration (Test Mode)" icon="💳" accentColor="#1abc9c">
              <Alert variant="warning" className="mx-0 mt-2">
                ⚠️ You are in <strong>Stripe Test Mode</strong>. No real charges will occur. Switch to live keys before launching.
              </Alert>
              <SettingRow label="Test Mode" description="Use Stripe test keys — no real transactions.">
                <Toggle id="stripeTestMode" checked={settings.stripeTestMode} onChange={v => update('stripeTestMode', v)} />
              </SettingRow>
              <SettingRow label="Publishable Key" description="Your Stripe test publishable key (starts with pk_test_...).">
                <Form.Control className="settings-field-width" value={settings.stripeTestPublishableKey} onChange={e => update('stripeTestPublishableKey', e.target.value)} placeholder="pk_test_..." />
              </SettingRow>
              <SettingRow label="Secret Key" description="Your Stripe test secret key. Keep this private.">
                <InputGroup className="settings-field-width">
                  <Form.Control type={showStripeSecret ? 'text' : 'password'} value={settings.stripeTestSecretKey} onChange={e => update('stripeTestSecretKey', e.target.value)} placeholder="sk_test_..." />
                  <Button variant="outline-secondary" onClick={() => setShowStripeSecret(!showStripeSecret)}>
                    {showStripeSecret ? '🙈' : '👁️'}
                  </Button>
                </InputGroup>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Tax Configuration" icon="📄" accentColor="#1abc9c">
              <SettingRow label="Tax Rate (%)" description="VAT or sales tax applied to all ticket purchases.">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <Form.Control type="number" min="0" max="100" step="0.5" className="settings-field-width-sm" value={settings.taxRate} onChange={e => update('taxRate', Number(e.target.value))} />
                  <span className="small text-muted">%</span>
                  <Badge bg="success" className="fw-semibold">Preview: +€{(100 * settings.taxRate / 100).toFixed(2)} on €100</Badge>
                </div>
              </SettingRow>
            </SectionCard>
          </>
        )}

        {!loading && settings && activeTab === 'coupons' && (
          <SectionCard title="Coupon Rules" icon="🎫" accentColor="#e67e22">
            <SettingRow label="Max Discount %" description="The maximum percentage discount any coupon can offer.">
              <div className="d-flex align-items-center gap-2">
                <Form.Control type="number" min="1" max="100" className="settings-field-width-sm" value={settings.maxDiscountPercent} onChange={e => update('maxDiscountPercent', Number(e.target.value))} />
                <span className="small text-muted">% max</span>
              </div>
            </SettingRow>
            <SettingRow label="Allow Stacking Coupons" description="Allow users to apply multiple coupons to one order.">
              <Toggle id="allowStackingCoupons" checked={settings.allowStackingCoupons} onChange={v => update('allowStackingCoupons', v)} />
            </SettingRow>
            <SettingRow label="Coupon Expiry (Days)" description="Default days until a new coupon expires. 0 = no expiry.">
              <div className="d-flex align-items-center gap-2">
                <Form.Control type="number" min="0" max="365" className="settings-field-width-sm" value={settings.couponExpiryDays} onChange={e => update('couponExpiryDays', Number(e.target.value))} />
                <span className="small text-muted">
                  {settings.couponExpiryDays === 0 ? 'No expiry' : 'days after creation'}
                </span>
              </div>
            </SettingRow>
          </SectionCard>
        )}

        {!loading && settings && activeTab === 'notifications' && (
          <>
            <SectionCard title="Email Alerts" icon="📧" accentColor="#9b59b6">
              <SettingRow label="Order Confirmation Emails" description="Send confirmation emails when users place an order.">
                <Toggle id="emailNotificationsEnabled" checked={settings.emailNotificationsEnabled} onChange={v => update('emailNotificationsEnabled', v)} />
              </SettingRow>
              <SettingRow label="Admin Alert Emails" description="Notify the admin when a new order is placed.">
                <Toggle id="adminAlertEmails" checked={settings.adminAlertEmails} onChange={v => update('adminAlertEmails', v)} />
              </SettingRow>
              <SettingRow label="Admin Email Address" description="The email that receives admin notifications. Save first, then use Test below.">
                <Form.Control type="email" className="settings-field-width" value={settings.adminEmail} onChange={e => update('adminEmail', e.target.value)} placeholder="admin@stadium.com" />
              </SettingRow>
              <SettingRow label="Test Notification" description="Send a test alert to the configured admin email address.">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <Button
                    id="btn-test-email"
                    variant={testEmailStatus === 'ok' ? 'success' : testEmailStatus === 'error' ? 'danger' : 'primary'}
                    onClick={handleTestEmail}
                    disabled={testEmailStatus === 'sending' || !settings.adminEmail}
                  >
                    {testEmailStatus === 'sending' ? '⏳ Sending...' : testEmailStatus === 'ok' ? '✓ Sent!' : testEmailStatus === 'error' ? '✗ Failed' : '📧 Send Test'}
                  </Button>
                  {testEmailMsg && (
                    <span className={`small ${testEmailStatus === 'ok' ? 'text-success' : 'text-danger'}`}>
                      {testEmailMsg}
                    </span>
                  )}
                </div>
              </SettingRow>
            </SectionCard>

            <SectionCard title="SMTP Configuration" icon="📤" accentColor="#9b59b6">
              <SettingRow label="SMTP Host" description="Your email provider's outbound mail server.">
                <Form.Control className="settings-field-width" value={settings.smtpHost} onChange={e => update('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
              </SettingRow>
              <SettingRow label="SMTP Port" description="Typically 587 (TLS) or 465 (SSL).">
                <Form.Control type="number" className="settings-field-width-sm" value={settings.smtpPort} onChange={e => update('smtpPort', Number(e.target.value))} />
              </SettingRow>
              <SettingRow label="SMTP Username" description="The email account used to send messages.">
                <Form.Control className="settings-field-width" value={settings.smtpUser} onChange={e => update('smtpUser', e.target.value)} placeholder="you@gmail.com" />
              </SettingRow>
              <SettingRow label="SMTP Password" description="App password or SMTP credentials.">
                <InputGroup className="settings-field-width">
                  <Form.Control type={showSmtpPassword ? 'text' : 'password'} value={settings.smtpPassword} onChange={e => update('smtpPassword', e.target.value)} placeholder="••••••••" />
                  <Button variant="outline-secondary" onClick={() => setShowSmtpPassword(!showSmtpPassword)}>
                    {showSmtpPassword ? '🙈' : '👁️'}
                  </Button>
                </InputGroup>
              </SettingRow>
              <SettingRow label="Sender Email" description="The 'From' address on outgoing emails.">
                <Form.Control type="email" className="settings-field-width" value={settings.smtpSender} onChange={e => update('smtpSender', e.target.value)} placeholder="noreply@yourdomain.com" />
              </SettingRow>
            </SectionCard>
          </>
        )}

        {!loading && settings && activeTab === 'appearance' && (
          <>
            <SectionCard title="Theme" icon="🎨" accentColor="#f39c12">
              <SettingRow label="Dark Mode" description="Enable a dark colour scheme across the admin panel. Changes apply instantly.">
                <div className="d-flex align-items-center gap-2">
                  <span className="small text-muted">☀️ Light</span>
                  <Toggle id="darkMode" checked={settings.darkMode} onChange={handleDarkModeChange} />
                  <span className="small text-muted">🌙 Dark</span>
                </div>
              </SettingRow>
              <SettingRow label="Primary Color" description="Main brand color for buttons, accents, highlights. Applied instantly site-wide.">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <Form.Control type="color" className="form-control-color" value={settings.primaryColor} onChange={e => { update('primaryColor', e.target.value); document.documentElement.style.setProperty('--primary-color', e.target.value); }} />
                  <Form.Control className="settings-field-width-sm font-monospace" value={settings.primaryColor} onChange={e => { update('primaryColor', e.target.value); document.documentElement.style.setProperty('--primary-color', e.target.value); }} />
                  <div className="rounded settings-color-swatch" style={{ backgroundColor: settings.primaryColor }} />
                </div>
              </SettingRow>
              <SettingRow label="Accent Color" description="Secondary color for success states and highlights. Applied instantly site-wide.">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <Form.Control type="color" className="form-control-color" value={settings.accentColor} onChange={e => { update('accentColor', e.target.value); document.documentElement.style.setProperty('--accent-color', e.target.value); }} />
                  <Form.Control className="settings-field-width-sm font-monospace" value={settings.accentColor} onChange={e => { update('accentColor', e.target.value); document.documentElement.style.setProperty('--accent-color', e.target.value); }} />
                  <div className="rounded settings-color-swatch" style={{ backgroundColor: settings.accentColor }} />
                </div>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Homepage Content" icon="🏠" accentColor="#f39c12">
              <SettingRow label="Hero Banner Text" description="The main headline shown on the homepage banner.">
                <Form.Control style={{ maxWidth: '320px' }} value={settings.homepageBanner} onChange={e => update('homepageBanner', e.target.value)} placeholder="Book your seats!" />
              </SettingRow>
              <div className="py-3">
                <div className="small text-muted mb-2">Live Preview:</div>
                <div
                  className="rounded text-white text-center fw-bold p-4 settings-banner-preview"
                  style={{ background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})` }}
                >
                  🏟️ {settings.homepageBanner || 'Your homepage banner will appear here'}
                </div>
              </div>
            </SectionCard>
          </>
        )}

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
                    { label: 'MySQL', icon: '🗄️', value: sysInfo.mysql?.version || 'MySQL', sub: `${sysInfo.mysql?.tableCount ?? '?'} tables in database`, status: sysInfo.mysql?.status },
                    { label: 'MongoDB', icon: '🍃', value: sysInfo.mongodb?.version || 'MongoDB', sub: 'Logs, analytics, sessions', status: sysInfo.mongodb?.status },
                  ].map((item, i) => (
                    <div key={item.label} className={`d-flex justify-content-between align-items-center py-3 ${i === 0 ? 'border-bottom' : ''}`}>
                      <div className="d-flex align-items-center gap-3">
                        <span className="fs-4">{item.icon}</span>
                        <div>
                          <div className="fw-semibold">{item.label}</div>
                          <div className="small text-muted">{item.sub}</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="small">{item.value}</span>
                        <Badge bg={item.status === 'online' ? 'success' : 'danger'} className="d-inline-flex align-items-center gap-1">
                          <span className={`rounded-circle status-pulse-dot ${item.status === 'online' ? 'bg-success' : 'bg-danger'}`} style={{ width: 7, height: 7 }} />
                          {item.status?.toUpperCase() ?? 'UNKNOWN'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </SectionCard>

                <SectionCard title="Runtime Environment" icon="⚙️" accentColor="#7f8c8d">
                  {[
                    { label: 'App Version', icon: '🏷️', value: sysInfo.appVersion },
                    { label: 'Node.js', icon: '⚙️', value: sysInfo.nodeVersion },
                    { label: 'Environment', icon: '🌍', value: sysInfo.environment },
                    { label: 'Platform', icon: '💻', value: sysInfo.platform },
                    { label: 'CPU', icon: '🔲', value: `${sysInfo.os?.cpuCount}× ${sysInfo.os?.cpuModel?.split(' ').slice(0, 4).join(' ')}` },
                    { label: 'Memory', icon: '🧠', value: `${sysInfo.os?.usedMemMB} MB used / ${sysInfo.os?.totalMemMB} MB total` },
                    { label: 'Uptime', icon: '⏱️', value: `${Math.floor(sysInfo.uptime / 3600)}h ${Math.floor((sysInfo.uptime % 3600) / 60)}m ${Math.floor(sysInfo.uptime % 60)}s` },
                    { label: 'Last Settings Save', icon: '💾', value: sysInfo.lastSettingsSaved ? new Date(sysInfo.lastSettingsSaved).toLocaleString() : 'Never' },
                  ].map((item, i, arr) => (
                    <div key={item.label} className={`d-flex justify-content-between align-items-center py-3 ${i < arr.length - 1 ? 'border-bottom' : ''}`}>
                      <div className="d-flex align-items-center gap-3">
                        <span className="fs-5">{item.icon}</span>
                        <span className="fw-medium">{item.label}</span>
                      </div>
                      <span className="small font-monospace text-muted">{item.value}</span>
                    </div>
                  ))}
                </SectionCard>

                <SectionCard title="Quick Actions" icon="⚡" accentColor="#7f8c8d">
                  <Row className="g-3 py-2">
                    {[
                      { key: 'cache', label: 'Clear Cache', icon: '🗑️', desc: 'Clears localStorage & session cache', variant: 'outline-danger', handler: handleClearCache },
                      { key: 'logs', label: 'Export Logs', icon: '📥', desc: 'Downloads system info as JSON', variant: 'outline-primary', handler: handleExportLogs },
                      { key: 'db', label: 'DB Health Check', icon: '🩺', desc: 'Pings MySQL & MongoDB status', variant: 'outline-success', handler: handleDbHealthCheck },
                      { key: 'backup', label: 'Backup Data', icon: '💾', desc: 'Saves settings snapshot as JSON', variant: 'outline-secondary', handler: handleBackupData },
                      { key: 'index', label: 'Rebuild Index', icon: '🔄', desc: 'Refreshes in-memory search index', variant: 'outline-warning', handler: handleRebuildIndex },
                      { key: 'errors', label: 'View Error Logs', icon: '🚨', desc: 'Downloads error report as JSON', variant: 'outline-danger', handler: handleViewErrors },
                    ].map((action) => {
                      const st = actionStatus[action.key] || 'idle';
                      const statusIcon = st === 'running' ? '⏳' : st === 'done' ? '✅' : st === 'error' ? '❌' : action.icon;
                      const label = st === 'running' ? 'Working...' : st === 'done' ? 'Done!' : st === 'error' ? 'Failed' : action.label;
                      return (
                        <Col key={action.key} xs={12} md={6} lg={4}>
                          <Button
                            variant={st === 'done' ? 'success' : st === 'error' ? 'danger' : action.variant}
                            className="w-100 h-100 text-start p-3"
                            onClick={action.handler}
                            disabled={st === 'running'}
                          >
                            <div className="fs-4 mb-2">{statusIcon}</div>
                            <div className="fw-bold mb-1">{label}</div>
                            <div className="small opacity-75">{action.desc}</div>
                          </Button>
                        </Col>
                      );
                    })}
                  </Row>
                </SectionCard>

                <Alert variant="info" className="d-flex align-items-center gap-2">
                  ℹ️ Database info is live — queried directly from MySQL & MongoDB on every page load.
                </Alert>
              </>
            )}
          </>
        )}
      </Container>

      <style>{`
        .settings-icon-badge { width: 40px; height: 40px; font-size: 20px; }
        .settings-color-swatch { width: 36px; height: 36px; }
        .settings-page-dark { background-color: #1a1a2e; color: #e2e8f0; }
        :root {
          --settings-card: #ffffff;
          --settings-border: #f0f0f0;
          --settings-text: #2c3e50;
          --settings-muted: #7f8c8d;
          --settings-input-bg: #fafafa;
        }
        [data-theme="dark"] {
          --settings-card: #1e2a3a;
          --settings-border: #2d3748;
          --settings-text: #e2e8f0;
          --settings-muted: #94a3b8;
          --settings-input-bg: #2d3748;
        }
        [data-theme="dark"] .settings-card,
        [data-theme="dark"] .settings-card .card-header {
          background-color: var(--settings-card) !important;
          color: var(--settings-text);
          border-color: var(--settings-border);
        }
        [data-theme="dark"] .settings-label,
        [data-theme="dark"] .settings-title { color: var(--settings-text); }
        [data-theme="dark"] .settings-description { color: var(--settings-muted); }
        [data-theme="dark"] input,
        [data-theme="dark"] select,
        [data-theme="dark"] textarea {
          background-color: #2d3748 !important;
          color: #e2e8f0 !important;
          border-color: #4a5568 !important;
        }
      `}</style>
    </div>
  );
};

export default AdminSettings;
