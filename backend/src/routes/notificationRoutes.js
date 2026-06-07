const express = require('express');
const { authenticate } = require('../middleware/auth');

const createNotificationRoutes = (pool) => {
  const router = express.Router();

  // All notification routes require authentication
  router.use(authenticate);

  // Get user's notifications
  router.get('/', async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const [rows] = await pool.query(
        'SELECT id, type, title, message, is_read, created_at, created_by FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      res.json({
        success: true,
        data: rows.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          isRead: !!n.is_read,
          timestamp: n.created_at,
          fromUserId: n.type === 'message' ? n.created_by : null,
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  // Mark notification as read
  router.patch('/:id/read', async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      await pool.query(
        'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Mark all notifications as read
  router.patch('/read-all', async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      await pool.query(
        'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = ? AND is_read = false',
        [userId]
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports = createNotificationRoutes;