const express = require('express');
const { authenticate } = require('../middleware/auth');

const createLogRoutes = (pool) => {
  const router = express.Router();

  router.use(authenticate);

  // POST /api/logs/activity - Log user activity to MongoDB (with MySQL audit_logs fallback)
  router.post('/activity', async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { action, description, resourceType, resourceId, metadata } = req.body;

      // Primary: log to MongoDB
      const mongoLog = req.app.get('mongoLogService');
      if (mongoLog) {
        await mongoLog.logActivity(
          userId,
          action || 'activity',
          resourceType || 'general',
          resourceId || null,
          description || 'Activity logged',
          metadata || {},
          req
        );
      }

      // Fallback: also log to MySQL audit_logs
      await pool.query(
        "INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
        [
          userId || null,
          action || 'activity',
          resourceType || 'general',
          resourceId || null,
          null,
          description ? JSON.stringify({ description, metadata }) : null,
          req.ip || null,
          req.headers['user-agent'] || null
        ]
      );

      res.json({ success: true, message: 'Activity logged to MongoDB + MySQL' });
    } catch (error) {
      // Fallback to MySQL only if MongoDB fails
      try {
        const userId = req.user?.id || req.user?.userId;
        const { action, description, resourceType } = req.body;
        await pool.query(
          "INSERT INTO audit_logs (user_id, action, entity, entity_id, new_value, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
          [
            userId || null,
            action || 'activity',
            resourceType || 'general',
            null,
            description ? JSON.stringify({ description }) : null,
            req.ip || null,
            req.headers['user-agent'] || null
          ]
        );
        return res.json({ success: true, message: 'Logged to MySQL (MongoDB unavailable)' });
      } catch (fallbackErr) {
        return res.status(500).json({ success: false, message: error.message });
      }
    }
  });

  // POST /api/logs/page-view — Track page view in MongoDB Analytics
  router.post('/page-view', async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { page, sessionId } = req.body;

      const mongoAnalytics = req.app.get('mongoAnalyticsService');
      if (mongoAnalytics && page) {
        await mongoAnalytics.trackPageView(page, userId, sessionId, {}, req);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /api/logs/search — Track search in MongoDB Analytics
  router.post('/search', async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { query, resultsCount, sessionId } = req.body;

      const mongoAnalytics = req.app.get('mongoAnalyticsService');
      if (mongoAnalytics && query) {
        await mongoAnalytics.trackSearch(query, resultsCount || 0, userId, sessionId);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};

module.exports = createLogRoutes;