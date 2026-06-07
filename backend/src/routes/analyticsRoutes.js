const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');

const createAnalyticsRoutes = () => {
  const router = express.Router();

  // All analytics routes require authentication + admin role
  router.use(authenticate);
  router.use(requireRole(['admin']));

  // GET /api/analytics/summary — Aggregated analytics for admin dashboard
  router.get('/summary', async (req, res, next) => {
    try {
      const mongoAnalytics = req.app.get('mongoAnalyticsService');
      if (!mongoAnalytics) {
        return res.json({ success: true, data: { note: 'MongoDB not available', metrics: [] } });
      }

      const days = parseInt(req.query.days) || 30;
      const metrics = await mongoAnalytics.getAnalytics(days);

      res.json({ success: true, data: { days, metrics } });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/analytics/page-views — Most viewed pages
  router.get('/page-views', async (req, res, next) => {
    try {
      const mongoAnalytics = req.app.get('mongoAnalyticsService');
      if (!mongoAnalytics) {
        return res.json({ success: true, data: [] });
      }

      const days = parseInt(req.query.days) || 30;
      const limit = parseInt(req.query.limit) || 10;
      const pageViews = await mongoAnalytics.getPageViews(days, limit);

      res.json({ success: true, data: pageViews });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/analytics/ticket-sales — Ticket sales over time
  router.get('/ticket-sales', async (req, res, next) => {
    try {
      const mongoAnalytics = req.app.get('mongoAnalyticsService');
      if (!mongoAnalytics) {
        return res.json({ success: true, data: [] });
      }

      const days = parseInt(req.query.days) || 30;
      const sales = await mongoAnalytics.getTicketSalesAnalytics(days);

      res.json({ success: true, data: sales });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/analytics/activity-stats — Activity log statistics
  router.get('/activity-stats', async (req, res, next) => {
    try {
      const mongoLog = req.app.get('mongoLogService');
      if (!mongoLog) {
        return res.json({ success: true, data: { total: 0, actions: [] } });
      }

      const days = parseInt(req.query.days) || 7;
      const stats = await mongoLog.getActivityStats(days);

      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/analytics/activities — Recent activity logs
  router.get('/activities', async (req, res, next) => {
    try {
      const mongoLog = req.app.get('mongoLogService');
      if (!mongoLog) {
        return res.json({ success: true, data: { logs: [], total: 0 } });
      }

      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;
      const filters = {};
      if (req.query.action) filters.action = req.query.action;
      if (req.query.resourceType) filters.resourceType = req.query.resourceType;
      if (req.query.userId) filters.userId = req.query.userId;

      const result = await mongoLog.getRecentActivities(limit, skip, filters);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports = createAnalyticsRoutes;