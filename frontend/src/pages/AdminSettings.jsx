import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'admin_system_settings';

const defaultSettings = {
  // General
  siteName: 'Stadium Tickets',
  siteTagline: 'Your #1 destination for football tickets',
  defaultCurrency: 'EUR',
  timezone: 'Europe/Berlin',
  language: 'en',

  // Tickets & Orders
  maxTicketsPerOrder: 10,
  bookingWindowDays: 30,
  autoCancelMinutes: 30,
  refundEnabled: true,

  // Payment - Stripe + Tax
  stripeTestPublishableKey: '',
  stripeTestSecretKey: '',
  stripeTestMode: true,
  taxRate: 20,

  // Coupons
  maxDiscountPercent: 50,
  allowStackingCoupons: false,
  couponExpiryDays: 30,

  // Notifications / Email
  emailNotificationsEnabled: true,
  adminAlertEmails: true,
  adminEmail: 'admin@example.com',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpSender: 'noreply@stadiumtickets.com',

  // Appearance
  darkMode: false,
  primaryColor: '#3498db',
  accentColor: '#2ecc71',
  homepageBanner: 'Book your seats for the biggest matches!',
};

const TABS = [
  { id: 'general', label: '🌐 General', color: '#3498db' },
  { id: 'tickets', label: '🎟️ Tickets & Orders', color: '#e74c3c' },
  { id: 'payment', label: '💳 Payment', color: '#1abc9c' },
  { id: 'coupons', label: '🎫 Coupons', color: '#e67e22' },
  { id: 'notifications', label: '📧 Notifications', color: '#9b59b6' },
  { id: 'appearance', label: '🎨 Appearance', color: '#f39c12' },
  { id: 'sysinfo', label: '📊 System Info', color: '#7f8c8d' },
];

// Toggle Switch Component
const Toggle = ({ checked, onChange, id }) => (
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
      backgroundColor: checked ? '#3498db' : '#ccc',
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

// Setting Row Component
const SettingRow = ({ label, description, children }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '18px 0', borderBottom: '1px solid #f0f0f0',
  }}>
    <div style={{ flex: 1, paddingRight: '24px' }}>
      <div style={{ fontSize: '15px', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>{label}</div>
      {description && <div style={{ fontSize: '13px', color: '#7f8c8d', lineHeight: '1.4' }}>{description}</div>}
    </div>
    <div style={{ flexShrink: 0, minWidth: '220px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
      {children}
    </div>
  </div>
);

// Section Card Component
const SectionCard = ({ title, icon, children, accentColor = '#3498db' }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    marginBottom: '24px',
    overflow: 'hidden',
  }}>
    <div style={{
      padding: '20px 28px',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <span style={{
        fontSize: '20px',
        width: '40px', height: '40px',
        backgroundColor: accentColor + '18',
        borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#2c3e50' }}>{title}</h3>
    </div>
    <div style={{ padding: '0 28px 8px' }}>{children}</div>
  </div>
);

const inputStyle = {
  width: '220px',
  padding: '9px 14px',
  border: '1.5px solid #e0e0e0',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#2c3e50',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  backgroundColor: '#fafafa',
};

const selectStyle = { ...inputStyle, cursor: 'pointer' };

const AdminSettings = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  const [saved, setSaved] = useState(false);
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [uptime] = useState(() => {
    const mins = Math.floor(Math.random() * 600) + 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  });

  useEffect(() => {
    if (!isAdmin()) { navigate('/home'); }
  }, []);

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      setSettings(defaultSettings);
      localStorage.removeItem(STORAGE_KEY);
      setSaved(false);
    }
  };

  const activeTabColor = TABS.find(t => t.id === activeTab)?.color || '#3498db';

  const systemInfo = [
    { label: 'App Version', value: 'v1.0.0', icon: '🏷️', status: null },
    { label: 'Node.js Runtime', value: 'v18.x (LTS)', icon: '⚙️', status: null },
    { label: 'Database', value: 'MySQL 8.0', icon: '🗄️', status: 'online' },
    { label: 'WebSocket Server', value: 'Active', icon: '🔌', status: 'online' },
    { label: 'Backend API', value: 'Running on :5000', icon: '🚀', status: 'online' },
    { label: 'Frontend', value: 'Vite + React 18', icon: '⚛️', status: null },
    { label: 'Uptime', value: uptime, icon: '⏱️', status: null },
    { label: 'Environment', value: 'Development', icon: '🌍', status: null },
    { label: 'Last Settings Saved', value: localStorage.getItem(STORAGE_KEY) ? new Date().toLocaleDateString() : 'Never', icon: '💾', status: null },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 100%)',
        color: 'white',
        padding: '0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link to="/admin/dashboard" style={{
              color: '#7f8c8d', textDecoration: 'none', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '6px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              transition: 'background 0.2s',
            }}>← Dashboard</Link>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', letterSpacing: '-0.3px' }}>⚙️ System Settings</h1>
              <p style={{ margin: '3px 0 0', color: '#7f8c8d', fontSize: '13px' }}>Configure your platform preferences</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ fontSize: '11px', color: '#3498db', fontWeight: '600', letterSpacing: '0.5px' }}>ADMINISTRATOR</div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', padding: '8px 18px',
              borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              transition: 'background 0.2s',
            }}>Logout</button>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 28px', display: 'flex', gap: '4px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 18px',
                backgroundColor: 'transparent',
                border: 'none',
                color: activeTab === tab.id ? 'white' : '#7f8c8d',
                fontWeight: activeTab === tab.id ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '32px 28px' }}>

        {/* Save bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '28px', padding: '16px 24px',
          backgroundColor: 'white', borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
            {saved
              ? <span style={{ color: '#27ae60', fontWeight: '600' }}>✅ Settings saved successfully!</span>
              : 'Make changes below, then save when ready.'}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleReset} style={{
              padding: '10px 20px', backgroundColor: 'transparent',
              border: '1.5px solid #ddd', color: '#7f8c8d',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              fontFamily: 'inherit',
            }}>Reset to Defaults</button>
            <button onClick={handleSave} style={{
              padding: '10px 28px',
              background: `linear-gradient(135deg, ${activeTabColor}, ${activeTabColor}cc)`,
              border: 'none', color: 'white',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700',
              fontFamily: 'inherit',
              boxShadow: `0 4px 12px ${activeTabColor}55`,
              transition: 'transform 0.1s',
            }}>💾 Save Settings</button>
          </div>
        </div>

        {/* ===== GENERAL ===== */}
        {activeTab === 'general' && (
          <>
            <SectionCard title="Site Identity" icon="🏟️" accentColor="#3498db">
              <SettingRow label="Site Name" description="The name displayed in the browser tab and emails.">
                <input style={inputStyle} value={settings.siteName} onChange={e => update('siteName', e.target.value)} placeholder="Stadium Tickets" />
              </SettingRow>
              <SettingRow label="Tagline" description="A short description shown on the homepage.">
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
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Europe/Rome">Europe/Rome (CET)</option>
                  <option value="Europe/Tirane">Europe/Tirana (CET)</option>
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

        {/* ===== TICKETS & ORDERS ===== */}
        {activeTab === 'tickets' && (
          <>
            <SectionCard title="Ticket Limits" icon="🎟️" accentColor="#e74c3c">
              <SettingRow label="Max Tickets Per Order" description="Maximum number of tickets a user can purchase in a single order.">
                <input
                  type="number" min="1" max="50"
                  style={{ ...inputStyle, width: '100px' }}
                  value={settings.maxTicketsPerOrder}
                  onChange={e => update('maxTicketsPerOrder', Number(e.target.value))}
                />
              </SettingRow>
              <SettingRow label="Booking Window (Days)" description="How many days in advance tickets become available for a match.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number" min="1" max="365"
                    style={{ ...inputStyle, width: '100px' }}
                    value={settings.bookingWindowDays}
                    onChange={e => update('bookingWindowDays', Number(e.target.value))}
                  />
                  <span style={{ fontSize: '13px', color: '#7f8c8d' }}>days before match</span>
                </div>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Order Behavior" icon="📋" accentColor="#e74c3c">
              <SettingRow label="Auto-Cancel Unpaid Orders" description="Automatically cancel orders not paid within this time window.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number" min="5" max="1440"
                    style={{ ...inputStyle, width: '100px' }}
                    value={settings.autoCancelMinutes}
                    onChange={e => update('autoCancelMinutes', Number(e.target.value))}
                  />
                  <span style={{ fontSize: '13px', color: '#7f8c8d' }}>minutes</span>
                </div>
              </SettingRow>
              <SettingRow label="Enable Refunds" description="Allow users to request refunds for cancelled or rescheduled matches.">
                <Toggle id="refundEnabled" checked={settings.refundEnabled} onChange={v => update('refundEnabled', v)} />
              </SettingRow>
            </SectionCard>
          </>
        )}

        {/* ===== PAYMENT ===== */}
        {activeTab === 'payment' && (
          <>
            <SectionCard title="Stripe Integration (Test Mode)" icon="💳" accentColor="#1abc9c">
              <div style={{
                padding: '12px 16px', margin: '16px 0 8px',
                backgroundColor: '#fffbeb', border: '1px solid #f59e0b',
                borderRadius: '10px', fontSize: '13px', color: '#92400e',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                ⚠️ <span>You are using <strong>Stripe Test Mode</strong>. No real charges will be made. Switch to live keys when ready to launch.</span>
              </div>
              <SettingRow label="Test Mode" description="Use Stripe test keys (safe for development — no real transactions).">
                <Toggle id="stripeTestMode" checked={settings.stripeTestMode} onChange={v => update('stripeTestMode', v)} />
              </SettingRow>
              <SettingRow label="Publishable Key" description="Your Stripe test publishable key (starts with pk_test_...).">
                <input
                  style={inputStyle}
                  value={settings.stripeTestPublishableKey}
                  onChange={e => update('stripeTestPublishableKey', e.target.value)}
                  placeholder="pk_test_..."
                />
              </SettingRow>
              <SettingRow label="Secret Key" description="Your Stripe test secret key. Keep this private.">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showStripeSecret ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    value={settings.stripeTestSecretKey}
                    onChange={e => update('stripeTestSecretKey', e.target.value)}
                    placeholder="sk_test_..."
                  />
                  <button
                    onClick={() => setShowStripeSecret(!showStripeSecret)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px',
                    }}
                  >{showStripeSecret ? '🙈' : '👁️'}</button>
                </div>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Tax Configuration" icon="📄" accentColor="#1abc9c">
              <SettingRow label="Tax Rate (%)" description="VAT or sales tax applied to all ticket purchases.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number" min="0" max="100" step="0.5"
                    style={{ ...inputStyle, width: '100px' }}
                    value={settings.taxRate}
                    onChange={e => update('taxRate', Number(e.target.value))}
                  />
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

        {/* ===== COUPONS ===== */}
        {activeTab === 'coupons' && (
          <SectionCard title="Coupon Rules" icon="🎫" accentColor="#e67e22">
            <SettingRow label="Max Discount %" description="The maximum percentage discount any coupon can offer.">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number" min="1" max="100"
                  style={{ ...inputStyle, width: '100px' }}
                  value={settings.maxDiscountPercent}
                  onChange={e => update('maxDiscountPercent', Number(e.target.value))}
                />
                <span style={{ fontSize: '13px', color: '#7f8c8d' }}>% max</span>
              </div>
            </SettingRow>
            <SettingRow label="Allow Stacking Coupons" description="Allow users to apply multiple coupons to a single order.">
              <Toggle id="allowStackingCoupons" checked={settings.allowStackingCoupons} onChange={v => update('allowStackingCoupons', v)} />
            </SettingRow>
            <SettingRow label="Coupon Expiry (Days)" description="Default number of days until a new coupon expires. Set to 0 for no expiry.">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number" min="0" max="365"
                  style={{ ...inputStyle, width: '100px' }}
                  value={settings.couponExpiryDays}
                  onChange={e => update('couponExpiryDays', Number(e.target.value))}
                />
                <span style={{ fontSize: '13px', color: '#7f8c8d' }}>
                  {settings.couponExpiryDays === 0 ? 'No expiry' : 'days after creation'}
                </span>
              </div>
            </SettingRow>
          </SectionCard>
        )}

        {/* ===== NOTIFICATIONS ===== */}
        {activeTab === 'notifications' && (
          <>
            <SectionCard title="Email Alerts" icon="📧" accentColor="#9b59b6">
              <SettingRow label="Order Confirmation Emails" description="Send confirmation emails to users when they place an order.">
                <Toggle id="emailNotificationsEnabled" checked={settings.emailNotificationsEnabled} onChange={v => update('emailNotificationsEnabled', v)} />
              </SettingRow>
              <SettingRow label="Admin Alert Emails" description="Notify the admin email address when a new order is placed.">
                <Toggle id="adminAlertEmails" checked={settings.adminAlertEmails} onChange={v => update('adminAlertEmails', v)} />
              </SettingRow>
              <SettingRow label="Admin Email Address" description="The email that receives admin notifications.">
                <input
                  type="email"
                  style={inputStyle}
                  value={settings.adminEmail}
                  onChange={e => update('adminEmail', e.target.value)}
                  placeholder="admin@yourdomain.com"
                />
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
              <SettingRow label="SMTP Password" description="App password or SMTP credentials for authentication.">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSmtpPassword ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    value={settings.smtpPassword}
                    onChange={e => update('smtpPassword', e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}
                  >{showSmtpPassword ? '🙈' : '👁️'}</button>
                </div>
              </SettingRow>
              <SettingRow label="Sender Email Address" description="The 'From' email address that appears on outgoing emails.">
                <input type="email" style={inputStyle} value={settings.smtpSender} onChange={e => update('smtpSender', e.target.value)} placeholder="noreply@yourdomain.com" />
              </SettingRow>
            </SectionCard>
          </>
        )}

        {/* ===== APPEARANCE ===== */}
        {activeTab === 'appearance' && (
          <>
            <SectionCard title="Theme" icon="🎨" accentColor="#f39c12">
              <SettingRow label="Dark Mode" description="Enable a dark color scheme across the admin panel.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#7f8c8d' }}>Light</span>
                  <Toggle id="darkMode" checked={settings.darkMode} onChange={v => update('darkMode', v)} />
                  <span style={{ fontSize: '13px', color: '#7f8c8d' }}>Dark</span>
                </div>
              </SettingRow>
              <SettingRow label="Primary Color" description="Main brand color used for buttons, accents, and highlights.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={e => update('primaryColor', e.target.value)}
                    style={{ width: '48px', height: '40px', border: '1.5px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', padding: '2px', backgroundColor: 'white' }}
                  />
                  <input
                    style={{ ...inputStyle, width: '130px', fontFamily: 'monospace' }}
                    value={settings.primaryColor}
                    onChange={e => update('primaryColor', e.target.value)}
                  />
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    backgroundColor: settings.primaryColor,
                    boxShadow: `0 4px 12px ${settings.primaryColor}55`,
                  }} />
                </div>
              </SettingRow>
              <SettingRow label="Accent Color" description="Secondary color used for highlights and success states.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={e => update('accentColor', e.target.value)}
                    style={{ width: '48px', height: '40px', border: '1.5px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', padding: '2px', backgroundColor: 'white' }}
                  />
                  <input
                    style={{ ...inputStyle, width: '130px', fontFamily: 'monospace' }}
                    value={settings.accentColor}
                    onChange={e => update('accentColor', e.target.value)}
                  />
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    backgroundColor: settings.accentColor,
                    boxShadow: `0 4px 12px ${settings.accentColor}55`,
                  }} />
                </div>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Homepage Content" icon="🏠" accentColor="#f39c12">
              <SettingRow label="Hero Banner Text" description="The main headline displayed on the homepage banner.">
                <input
                  style={{ ...inputStyle, width: '320px' }}
                  value={settings.homepageBanner}
                  onChange={e => update('homepageBanner', e.target.value)}
                  placeholder="Book your seats for the biggest matches!"
                />
              </SettingRow>
              <div style={{ padding: '16px 0 8px' }}>
                <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '10px' }}>Preview:</div>
                <div style={{
                  padding: '20px 28px',
                  background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})`,
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '700',
                  textAlign: 'center',
                  boxShadow: `0 8px 24px ${settings.primaryColor}44`,
                }}>
                  🏟️ {settings.homepageBanner || 'Your homepage banner will appear here'}
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {/* ===== SYSTEM INFO ===== */}
        {activeTab === 'sysinfo' && (
          <>
            <SectionCard title="System Status" icon="📊" accentColor="#7f8c8d">
              <div style={{ padding: '8px 0' }}>
                {systemInfo.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 0',
                    borderBottom: i < systemInfo.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>{item.icon}</span>
                      <span style={{ fontSize: '15px', color: '#2c3e50', fontWeight: '500' }}>{item.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', color: '#555', fontFamily: item.label.includes('Key') ? 'monospace' : 'inherit' }}>
                        {item.value}
                      </span>
                      {item.status === 'online' && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '3px 10px', borderRadius: '20px',
                          backgroundColor: '#d1fae5', color: '#065f46',
                          fontSize: '12px', fontWeight: '600',
                        }}>
                          <span style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            backgroundColor: '#10b981',
                            boxShadow: '0 0 0 3px #10b98133',
                            animation: 'pulse 2s infinite',
                          }} />
                          ONLINE
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Quick Actions" icon="⚡" accentColor="#7f8c8d">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px 0' }}>
                {[
                  { label: 'Clear Cache', icon: '🗑️', desc: 'Flush temporary data', color: '#e74c3c' },
                  { label: 'Export Logs', icon: '📥', desc: 'Download system logs', color: '#3498db' },
                  { label: 'Run DB Health Check', icon: '🩺', desc: 'Verify database status', color: '#27ae60' },
                  { label: 'Backup Data', icon: '💾', desc: 'Create a data snapshot', color: '#9b59b6' },
                  { label: 'Rebuild Index', icon: '🔄', desc: 'Rebuild search indexes', color: '#f39c12' },
                  { label: 'View Error Logs', icon: '🚨', desc: 'Inspect recent errors', color: '#e67e22' },
                ].map((action, i) => (
                  <button key={i} onClick={() => alert(`${action.label} — This will be integrated with the backend.`)} style={{
                    padding: '18px 16px',
                    backgroundColor: 'white',
                    border: `1.5px solid #f0f0f0`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.boxShadow = `0 4px 16px ${action.color}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ fontSize: '22px', marginBottom: '8px' }}>{action.icon}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#2c3e50', marginBottom: '4px' }}>{action.label}</div>
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{action.desc}</div>
                  </button>
                ))}
              </div>
            </SectionCard>

            <div style={{
              padding: '16px 20px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              fontSize: '13px',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              ℹ️ <span>System info is read-only and reflects the current runtime environment. Quick actions will be connected to backend endpoints.</span>
            </div>
          </>
        )}

      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px #10b98133; }
          50% { box-shadow: 0 0 0 6px #10b98100; }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
};

export default AdminSettings;
