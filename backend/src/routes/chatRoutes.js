const express = require('express');
const { authenticate } = require('../middleware/auth');

const createChatRoutes = (pool) => {
  const router = express.Router();
  router.use(authenticate);

  // List users available for chat (excluding current user)
  router.get('/contacts', async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const [rows] = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.email,
                GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ',') AS roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.is_active = 1 AND u.id != ?
         GROUP BY u.id, u.first_name, u.last_name, u.email
         ORDER BY u.first_name, u.last_name`,
        [userId]
      );
      res.json({
        success: true,
        data: rows.map((u) => ({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.email,
          roles: u.roles ? u.roles.split(',') : [],
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  // Message history with a specific user (from notifications)
  router.get('/conversation/:otherUserId', async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const otherUserId = parseInt(req.params.otherUserId, 10);

      if (!otherUserId || otherUserId === userId) {
        return res.status(400).json({ success: false, message: 'Invalid conversation partner' });
      }

      const [otherUser] = await pool.query(
        'SELECT id, first_name, last_name FROM users WHERE id = ? AND is_active = 1',
        [otherUserId]
      );
      if (!otherUser.length) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const otherName = `${otherUser[0].first_name} ${otherUser[0].last_name}`;

      const [received] = await pool.query(
        `SELECT id, message, created_at
         FROM notifications
         WHERE user_id = ? AND type = 'message'
           AND title LIKE ?
         ORDER BY created_at ASC
         LIMIT 100`,
        [userId, `New message from ${otherName}%`]
      );

      const [sent] = await pool.query(
        `SELECT id, message, created_at
         FROM notifications
         WHERE user_id = ? AND type = 'message_sent'
           AND title LIKE ?
         ORDER BY created_at ASC
         LIMIT 100`,
        [userId, `Message to user #${otherUserId}%`]
      );

      const messages = [
        ...received.map((m) => ({
          id: `r-${m.id}`,
          from: otherUserId,
          to: userId,
          message: m.message,
          timestamp: m.created_at,
          direction: 'in',
        })),
        ...sent.map((m) => ({
          id: `s-${m.id}`,
          from: userId,
          to: otherUserId,
          message: m.message,
          timestamp: m.created_at,
          direction: 'out',
        })),
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      res.json({
        success: true,
        data: {
          partner: {
            id: otherUserId,
            firstName: otherUser[0].first_name,
            lastName: otherUser[0].last_name,
          },
          messages,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports = createChatRoutes;
