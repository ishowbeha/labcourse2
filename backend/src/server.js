require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const DatabaseConfig = require('../config/database');
const connectMongoDB = require('../config/mongodb');
const { connectMySQL } = require('../config/mysql');
const errorHandler = require('./middleware/errorHandler');
const createAuthRoutes = require('./routes/authRoutes');
const createUserRoutes = require('./routes/userRoutes');
const createMatchRoutes = require('./routes/matchRoutes');
const createAdminRoutes = require('./routes/adminRoutes');
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

// Middleware
app.use(cors());
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
    // Initialize SQLite database (primary - for structured data)
    const db = DatabaseConfig.init();
    DatabaseConfig.runMigrations(db);
    DatabaseConfig.seedData(db);
    console.log('✅ SQLite database initialized');

    // Make SQLite database available to routes
    app.set('db', db);

    // Initialize MongoDB (for flexible data - logs, analytics)
    await connectMongoDB();

    // Initialize MySQL (for relational data - alternative to SQLite)
    await connectMySQL();

    // Setup WebSocket handlers
    setupWebSocket(io, db);

    // Routes
    app.use('/api/auth', createAuthRoutes(db));
    app.use('/api/users', createUserRoutes(db));
    app.use('/api/matches', createMatchRoutes(db));
    app.use('/api/admin', createAdminRoutes(db));

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        databases: {
          sqlite: 'Connected (file-based)',
          mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected',
          mysql: 'Configured'
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
      console.log(`   - SQLite (file-based, primary)`);
      console.log(`   - MongoDB (flexible data, logs, analytics)`);
      console.log(`   - MySQL (relational data, alternative)`);
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