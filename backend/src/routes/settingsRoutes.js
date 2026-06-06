const express = require('express');
const SettingsController = require('../controllers/SettingsController');
const { authenticate, requireRole } = require('../middleware/auth');

const createSettingsRoutes = (db) => {
  const router = express.Router();
  const controller = new SettingsController(db);

  // All settings routes require authentication + admin role
  router.use(authenticate);
  router.use(requireRole(['admin']));

  // GET  /api/admin/settings          → fetch all settings
  router.get('/', controller.getSettings.bind(controller));

  // PUT  /api/admin/settings          → save changed settings
  router.put('/', controller.updateSettings.bind(controller));

  // POST /api/admin/settings/reset    → reset to factory defaults
  router.post('/reset', controller.resetSettings.bind(controller));

  // GET  /api/admin/settings/sysinfo  → real runtime + DB status
  router.get('/sysinfo', controller.getSystemInfo.bind(controller));

  // POST /api/admin/settings/test-email → send test notification
  router.post('/test-email', controller.sendTestEmail.bind(controller));

  return router;
};

module.exports = createSettingsRoutes;
