const express = require('express');
const { authenticate } = require('../middleware/auth');

const createLogRoutes = (pool) => {
  const router = express.Router();

  router.use(authenticate);

  // POST /api/logs/activity - Log user activity
  router.post('/activity', async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { action, description } = req.body;

      await pool.query(
        "INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId || null,
          action || 'activity',
          'general',
          null,
          null,
          description ? JSON.stringify({ description }) : null,
          req.ip || null,
          req.headers['user-agent'] || null
        ]
      );

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};

module.exports = createLogRoutes;