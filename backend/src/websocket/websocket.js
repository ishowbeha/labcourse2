// WebSocket handler for real-time communication
const jwt = require('jsonwebtoken');

// Store connected users
const connectedUsers = new Map();

const setupWebSocket = (io, sequelize) => {
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

    // Get user info from database using Sequelize
    try {
      const User = sequelize.models.User;
      const user = await User.findByPk(socket.userId, {
        attributes: ['id', 'firstName', 'lastName', 'email']
      });
      if (user) {
        socket.userName = `${user.firstName} ${user.lastName}`;
        socket.userEmail = user.email;
      }
    } catch (error) {
      console.error('Error fetching user info:', error.message);
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

      // Save message to database using Sequelize
      try {
        const Notification = sequelize.models.Notification;
        await Notification.create({
          userId: to,
          type: 'message',
          title: `New message from ${socket.userName}`,
          message: message,
          data: JSON.stringify(messageData),
          read: false,
          createdAt: new Date()
        });
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
        const Notification = sequelize.models.Notification;
        await Notification.update(
          { read: true },
          { where: { id: notificationId, userId: socket.userId } }
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
      io.emit('online-users', { count: connectedUsers.size, users: Array.from(connectedUsers.values()) });
    });
  });

  // Helper function to send notification to specific user
  const notifyUser = async (userId, notification) => {
    const notificationData = {
      ...notification,
      id: Date.now(),
      timestamp: new Date().toISOString()
    };

    // Save to database using Sequelize
    try {
      const Notification = sequelize.models.Notification;
      await Notification.create({
        userId: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: JSON.stringify(notificationData),
        read: false,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error saving notification:', error.message);
    }

    // Send real-time notification
    io.to(`user:${userId}`).emit('notification', notificationData);
  };

  // Helper function to broadcast to all admins
  const notifyAdmins = async (notification) => {
    // Get all admin users using Sequelize
    try {
      const User = sequelize.models.User;
      const Role = sequelize.models.Role;
      const UserRole = sequelize.models.UserRole;
      
      const admins = await User.findAll({
        include: [{
          model: Role,
          through: UserRole,
          where: { name: 'admin' }
        }],
        where: { isActive: true }
      });

      for (const admin of admins) {
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