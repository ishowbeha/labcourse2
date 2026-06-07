const mongoose = require('mongoose');

class SettingsService {
  constructor(db) {
    this.db = db; // MySQL pool
  }

  _parse(row) {
    if (!row) return null;
    const value = row.value ?? row.setting_value;
    const type = row.type ?? row.setting_type ?? 'string';
    if (value === null) return null;
    switch (type) {
      case 'boolean': return value === 'true' || value === '1';
      case 'number':  return parseFloat(value);
      case 'json':    try { return JSON.parse(value); } catch { return value; }
      default:        return value;
    }
  }

  _key(row) {
    return row.key ?? row.setting_key;
  }

  _serialize(value) {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object')  return JSON.stringify(value);
    return String(value);
  }

  async getAllSettings() {
    const [rows] = await this.db.query('SELECT * FROM settings ORDER BY category, `key`');
    const result = {};
    for (const row of rows) {
      result[this._key(row)] = this._parse(row);
    }
    return result;
  }

  async getAllSettingsWithMeta() {
    const [rows] = await this.db.query('SELECT * FROM settings ORDER BY category, `key`');
    return rows.map((row) => ({
      ...row,
      setting_key: row.key,
      setting_value: row.value,
      setting_type: row.type,
      parsed_value: this._parse(row),
    }));
  }

  async updateSettings(settingsMap, updatedBy = null) {
    if (!settingsMap || typeof settingsMap !== 'object') {
      throw new Error('Settings must be a key-value object');
    }

    const entries = Object.entries(settingsMap);
    if (entries.length === 0) return { updated: 0 };

    let updated = 0;
    for (const [key, value] of entries) {
      const serialized = this._serialize(value);
      const [result] = await this.db.query(
        'UPDATE settings SET value = ?, updated_by = ?, updated_at = NOW() WHERE `key` = ?',
        [serialized, updatedBy, key]
      );
      if (result.affectedRows > 0) updated++;
    }

    return { updated };
  }

  async resetToDefaults(updatedBy = null) {
    const defaults = {
      site_name:                   'Stadium Tickets',
      site_tagline:                'Your #1 destination for football tickets',
      default_currency:            'EUR',
      timezone:                    'Europe/Berlin',
      language:                    'en',
      max_tickets_per_order:       10,
      booking_window_days:         30,
      auto_cancel_minutes:         30,
      refund_enabled:              true,
      stripe_test_mode:            true,
      stripe_publishable_key:      '',
      stripe_secret_key:           '',
      tax_rate:                    20,
      max_discount_percent:        50,
      allow_stacking_coupons:      false,
      coupon_expiry_days:          30,
      email_notifications_enabled: true,
      admin_alert_emails:          true,
      admin_email:                 'admin@stadiumtickets.com',
      smtp_host:                   'smtp.gmail.com',
      smtp_port:                   587,
      smtp_user:                   '',
      smtp_password:               '',
      smtp_sender:                 'noreply@stadiumtickets.com',
      dark_mode:                   false,
      primary_color:               '#3498db',
      accent_color:                '#2ecc71',
      homepage_banner:             'Book your seats for the biggest matches!',
    };

    return this.updateSettings(defaults, updatedBy);
  }

  async getSystemInfo() {
    const info = {
      nodeVersion:    process.version,
      platform:       process.platform,
      uptime:         process.uptime(),
      memoryUsage:    process.memoryUsage(),
      environment:    process.env.NODE_ENV || 'development',
      appVersion:     'v1.0.0',
      mysql:          { status: 'unknown', version: null, tableCount: null },
      mongodb:        { status: 'unknown', version: null },
      lastSettingsSaved: null,
    };

    try {
      const [[versionRow]]   = await this.db.query('SELECT VERSION() as version');
      const [[tableRow]]     = await this.db.query(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE()`
      );
      const [[settingsRow]]  = await this.db.query(
        'SELECT MAX(updated_at) as last_saved FROM settings'
      );
      info.mysql.status     = 'online';
      info.mysql.version    = versionRow?.version || 'MySQL';
      info.mysql.tableCount = tableRow?.cnt || 0;
      info.lastSettingsSaved = settingsRow?.last_saved || null;
    } catch (e) {
      info.mysql.status = 'offline';
      info.mysql.error  = e.message;
    }

    const mongoState = mongoose.connection.readyState;
    const mongoStateMap = { 0: 'offline', 1: 'online', 2: 'connecting', 3: 'disconnecting' };
    info.mongodb.status = mongoStateMap[mongoState] || 'unknown';
    if (mongoState === 1) {
      try {
        const adminDb = mongoose.connection.db.admin();
        const serverInfo = await adminDb.serverInfo();
        info.mongodb.version = serverInfo?.version || 'MongoDB';
      } catch {
        info.mongodb.version = 'MongoDB';
      }
    }

    return info;
  }
}

module.exports = SettingsService;
