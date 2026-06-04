const express = require('express');
const ReportsController = require('../controllers/ReportsController');
const { authenticate, requireRole } = require('../middleware/auth');

const createReportRoutes = (pool) => {
  const router = express.Router();
  const controller = new ReportsController(pool);

  // All report routes require authentication + admin role
  router.use(authenticate);
  router.use(requireRole(['admin']));

  // GET /api/reports/activity-logs - User activities
  router.get('/activity-logs', (req, res) => controller.getActivityLogs(req, res));

  return router;
};

module.exports = createReportRoutes;