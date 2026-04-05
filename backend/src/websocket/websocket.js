// WebSocket handler for real-time communication
const jwt = require('jsonwebtoken');

// Store connected users
const connectedUsers = new Map();

const setupWebSocket = (io, db) => {
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

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId} (Socket: ${socket.id})`);

    // Store user connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      connectedAt: new Date().toISOString()
    });

    // Get user info from database
    const user = db.prepare('SELECT id, first_name, last_name, email FROM users WHERE id = ?').get(socket.userId);
    if (user) {
      socket.userName = `${user.first_name} ${user.last_name}`;
      socket.userEmail = user.email;
    }

    // Join user to their own room
    socket.join(`user:${socket.userId}`);

    // Broadcast online user count
    io.emit('online-users', { count: connectedUsers.size, users: Array.from(connectedUsers.values()) });

    // Send welcome message
    socket.emit('welcome', {
      message: 'Connected to Stadium Tickets WebSocket',
      timestamp: new Date().toISOString()
    });

    // Handle chat messages
    socket.on('send-message', (data) => {
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

      // Save message to database
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `).run(
          to,
          'message',
          `New message from ${socket.userName}`,
          message,
          JSON.stringify(messageData),
          new Date().toISOString()
        );
      } catch (error) {
        console.error('Error saving message:', error);
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
    socket.on('mark-notification-read', (data) => {
      const { notificationId } = data;
      try {
        db.prepare(`
          UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?
        `).run(notificationId, socket.userId);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId);
      
      // Broadcast updated online count
      io.emit('online-users', { count: connectedUsers.size, users: Array.from(connectedUsers.values()) });
    });
  });

  // Helper function to send notification to specific user
  const notifyUser = (userId, notification) => {
    const notificationData = {
      ...notification,
      id: Date.now(),
      timestamp: new Date().toISOString()
    };

    // Save to database
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `).run(
        userId,
        notification.type,
        notification.title,
        notification.message,
        JSON.stringify(notificationData),
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error saving notification:', error);
    }

    // Send real-time notification
    io.to(`user:${userId}`).emit('notification', notificationData);
  };

  // Helper function to broadcast to all admins
  const notifyAdmins = (notification) => {
    // Get all admin users
    const admins = db.prepare(`
      SELECT u.id FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'admin' AND u.is_active = 1
    `).all();

    admins.forEach(admin => {
      notifyUser(admin.id, notification);
    });
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