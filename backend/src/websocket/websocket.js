// WebSocket handler for real-time communication
const jwt = require('jsonwebtoken');

// Store connected users
const connectedUsers = new Map();

const setupWebSocket = (io, pool) => {
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded.type !== 'access') {
        return next(new Error('Invalid token type'));
      }
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 User connected: ${socket.userId} (Socket: ${socket.id})`);

    // Store user connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      connectedAt: new Date().toISOString()
    });

    // Get user info from database using pool
    try {
      const [users] = await pool.query(
        'SELECT id, first_name, last_name, email FROM users WHERE id = ?',
        [socket.userId]
      );
      if (users.length > 0) {
        socket.userName = `${users[0].first_name} ${users[0].last_name}`;
        socket.userEmail = users[0].email;
      }
    } catch (error) {
      console.error('Error fetching user info:', error.message);
    }

    // Join user to their own room
    socket.join(`user:${socket.userId}`);

    const getOnlineUsersPayload = () => ({
      count: connectedUsers.size,
      users: Array.from(connectedUsers.entries()).map(([userId, info]) => ({
        userId: Number(userId),
        ...info,
      })),
    });

    // Broadcast online user count
    io.emit('online-users', getOnlineUsersPayload());

    // Send welcome message
    socket.emit('welcome', {
      message: 'Connected to Stadium Tickets WebSocket',
      timestamp: new Date().toISOString()
    });

    // Handle chat messages
    socket.on('send-message', async (data) => {
      const { to, message, type = 'text' } = data;
      
      const messageData = {
        id: Date.now(),
        from: socket.userId,
        fromName: socket.userName,
        to,
        message,
        type,
        timestamp: new Date().toISOString(),
        status: 'delivered'
      };

      // Save message for recipient and sender history
      try {
        await pool.query(
          'INSERT INTO notifications (user_id, type, title, message, is_read, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, false, ?, NOW(), NOW())',
          [to, 'message', `New message from ${socket.userName}`, message, socket.userId]
        );
        await pool.query(
          'INSERT INTO notifications (user_id, type, title, message, is_read, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, true, ?, NOW(), NOW())',
          [socket.userId, 'message_sent', `Message to user #${to}`, message, socket.userId]
        );
      } catch (error) {
        console.error('Error saving message:', error.message);
      }

      // Send to recipient
      socket.to(`user:${to}`).emit('receive-message', messageData);

      // Confirm to sender
      socket.emit('message-sent', { ...messageData, status: 'delivered' });
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      socket.to(`user:${data.to}`).emit('user-typing', {
        from: socket.userId,
        fromName: socket.userName,
        isTyping: true
      });
    });

    socket.on('stop-typing', (data) => {
      socket.to(`user:${data.to}`).emit('user-typing', {
        from: socket.userId,
        fromName: socket.userName,
        isTyping: false
      });
    });

    // Handle notification read
    socket.on('mark-notification-read', async (data) => {
      const { notificationId } = data;
      try {
        await pool.query(
          'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = ? AND user_id = ?',
          [notificationId, socket.userId]
        );
      } catch (error) {
        console.error('Error marking notification as read:', error.message);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId);
      
      // Broadcast updated online count
      io.emit('online-users', getOnlineUsersPayload());
    });
  });

  // Helper function to send notification to specific user
  const notifyUser = async (userId, notification) => {
    const notificationData = {
      ...notification,
      id: Date.now(),
      timestamp: new Date().toISOString()
    };

    // Save to database using pool
    try {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, false, NOW())',
        [userId, notification.type, notification.title, notification.message]
      );
    } catch (error) {
      console.error('Error saving notification:', error.message);
    }

    // Send real-time notification
    io.to(`user:${userId}`).emit('notification', notificationData);
  };

  // Helper function to broadcast to all admins
  const notifyAdmins = async (notification) => {
    // Get all admin users using pool
    try {
      const [adminUsers] = await pool.query(`
        SELECT u.id FROM users u
        INNER JOIN user_roles ur ON u.id = ur.user_id
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE r.name = 'admin' AND u.is_active = 1
      `);

      for (const admin of adminUsers) {
        await notifyUser(admin.id, notification);
      }
    } catch (error) {
      console.error('Error notifying admins:', error.message);
    }
  };

  // Helper function to broadcast to all users
  const broadcastToAll = (notification) => {
    io.emit('broadcast', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  };

  // Expose notification functions
  io.notifyUser = notifyUser;
  io.notifyAdmins = notifyAdmins;
  io.broadcastToAll = broadcastToAll;

  console.log('✅ WebSocket setup complete');

  return { io, notifyUser, notifyAdmins, broadcastToAll };
};

module.exports = { setupWebSocket };