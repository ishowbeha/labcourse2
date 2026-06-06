const SettingsService = require('../services/SettingsService');
const os = require('os');

class SettingsController {
  constructor(db) {
    this.db = db;
    this.service = new SettingsService(db);
  }

  // GET /api/admin/settings
  // Returns all settings as a flat key-value map
  async getSettings(req, res, next) {
    try {
      const settings = await this.service.getAllSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/admin/settings
  // Accepts { key: value, ... } body and updates only provided keys
  async updateSettings(req, res, next) {
    try {
      const updatedBy = req.user?.id || req.user?.userId || null;
      const settingsMap = req.body;

      if (!settingsMap || typeof settingsMap !== 'object' || Array.isArray(settingsMap)) {
        return res.status(400).json({ success: false, message: 'Request body must be a settings object' });
      }

      // Strip any unknown keys (only update keys that exist in the DB)
      const [existingRows] = await this.db.query('SELECT setting_key FROM system_settings');
      const validKeys = new Set(existingRows.map(r => r.setting_key));
      const filtered = {};
      for (const [k, v] of Object.entries(settingsMap)) {
        if (validKeys.has(k)) filtered[k] = v;
      }

      if (Object.keys(filtered).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid setting keys provided' });
      }

      const result = await this.service.updateSettings(filtered, updatedBy);
      res.json({ success: true, message: `${result.updated} setting(s) saved`, data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/settings/reset
  // Resets all settings to factory defaults
  async resetSettings(req, res, next) {
    try {
      const updatedBy = req.user?.id || req.user?.userId || null;
      const result = await this.service.resetToDefaults(updatedBy);
      const settings = await this.service.getAllSettings();
      res.json({ success: true, message: 'All settings reset to defaults', data: settings });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/settings/sysinfo
  // Returns real runtime + database info
  async getSystemInfo(req, res, next) {
    try {
      const info = await this.service.getSystemInfo();

      // Add OS-level info
      const totalMem = os.totalmem();
      const freeMem  = os.freemem();

      res.json({
        success: true,
        data: {
          ...info,
          os: {
            hostname:    os.hostname(),
            type:        os.type(),
            arch:        os.arch(),
            totalMemMB:  Math.round(totalMem / 1024 / 1024),
            freeMemMB:   Math.round(freeMem  / 1024 / 1024),
            usedMemMB:   Math.round((totalMem - freeMem) / 1024 / 1024),
            cpuCount:    os.cpus().length,
            cpuModel:    os.cpus()[0]?.model || 'Unknown',
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
  // POST /api/admin/settings/test-email
  // Records a test notification for the configured admin email
  async sendTestEmail(req, res, next) {
    try {
      const [[row]] = await this.db.query(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'admin_email'"
      );
      const adminEmail = row?.setting_value || '';
      if (!adminEmail) {
        return res.json({
          success: false,
          message: 'No admin email configured. Go to Notifications tab, set Admin Email Address, and Save first.'
        });
      }

      const timestamp = new Date().toISOString();
      console.log(`[NOTIFICATION] Test alert recorded for: ${adminEmail} at ${timestamp}`);

      res.json({
        success: true,
        message: `✅ Test notification recorded for ${adminEmail}. Configure SMTP settings to enable real email delivery.`,
        data: { to: adminEmail, timestamp }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SettingsController;
