require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const { initializeMySQL, sequelize } = require('../config/mysql');
const { defineAssociations } = require('./models/mysql');
const connectMongoDB = require('../config/mongodb');
const errorHandler = require('./middleware/errorHandler');
const createAuthRoutes = require('./routes/authRoutes');
const createUserRoutes = require('./routes/userRoutes');
const createMatchRoutes = require('./routes/matchRoutes');
const createAdminRoutes = require('./routes/adminRoutes');
const createStadiumRoutes = require('./routes/stadiumRoutes');
const { setupWebSocket } = require('./websocket/websocket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io available to routes
app.set('io', io);

// CORS Configuration - Allow credentials for cookies
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize databases and start server
const startServer = async () => {
  try {
    // Initialize MySQL as primary database
    const mysqlConnected = await initializeMySQL();
    if (!mysqlConnected) {
      console.error('❌ Failed to initialize MySQL. Server cannot start.');
      process.exit(1);
    }
    
    // Note: Model associations are already defined in connectMySQL
    
    // Initialize MongoDB (for flexible data - logs, analytics)
    await connectMongoDB();

    // Setup WebSocket handlers
    setupWebSocket(io, sequelize);

    // Routes
    app.use('/api/auth', createAuthRoutes(sequelize));
    app.use('/api/users', createUserRoutes(sequelize));
    app.use('/api/matches', createMatchRoutes(sequelize));
    app.use('/api/admin', createAdminRoutes(sequelize));
    app.use('/api/stadiums', createStadiumRoutes(sequelize));

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        databases: {
          mysql: 'Connected (primary)',
          mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected'
        },
        websocket: 'Socket.IO enabled',
        stack: 'MERN (MongoDB + Express + React + Node.js + MySQL)'
      });
    });

    // Error handling middleware
    app.use(errorHandler);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`💾 Databases:`);
      console.log(`   - MySQL (primary, relational data)`);
      console.log(`   - MongoDB (flexible data, logs, analytics)`);
      console.log(`🔌 WebSocket: Socket.IO enabled at http://localhost:${PORT}`);
      console.log(`🔐 Auth endpoints:`);
      console.log(`   POST /api/auth/register - Register new user`);
      console.log(`   POST /api/auth/login - User login`);
      console.log(`   GET /api/auth/profile - Get user profile (requires auth)`);
      console.log(`👑 Admin endpoints (requires admin role):`);
      console.log(`   GET /api/admin/stats - Dashboard statistics`);
      console.log(`   GET /api/admin/users - User management`);
      console.log(`   GET /api/admin/reports/ticket-sales - Ticket sales by match`);
      console.log(`   GET /api/admin/orders - Order management`);
      console.log(`🏟️ Stadium endpoints (requires admin role):`);
      console.log(`   GET /api/stadiums - Get all stadiums`);
      console.log(`   POST /api/stadiums - Create stadium`);
      console.log(`   PUT /api/stadiums/:id - Update stadium`);
      console.log(`   DELETE /api/stadiums/:id - Delete stadium`);
      console.log(`   POST /api/stadiums/:stadiumId/sections - Create section`);
      console.log(`   PUT /api/stadiums/:stadiumId/sections/:sectionId - Update section`);
      console.log(`   DELETE /api/stadiums/:stadiumId/sections/:sectionId - Delete section`);
      console.log(`💡 Visit http://localhost:${PORT}/api/health to check status`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

module.exports = app;