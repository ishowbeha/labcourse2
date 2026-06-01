require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const DatabaseConfig = require('../config/database');
const { sequelize } = require('../config/mysql');
const connectMongoDB = require('../config/mongodb');
const errorHandler = require('./middleware/errorHandler');
const createAuthRoutes = require('./routes/authRoutes');
const createUserRoutes = require('./routes/userRoutes');
const createMatchRoutes = require('./routes/matchRoutes');
const createAdminRoutes = require('./routes/adminRoutes');
const createStadiumRoutes = require('./routes/stadiumRoutes');
const createFootballRoutes = require('./routes/footballRoutes');
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
    // Initialize SQLite as primary database
    console.log('🗄️ Initializing SQLite database...');
    const db = DatabaseConfig.init();
    DatabaseConfig.runMigrations(db);
    DatabaseConfig.seedData(db);
    
    // Make db available to auth middleware via req.app.get('db')
    app.set('db', db);
    
    console.log('✅ SQLite database initialized successfully');
    
    // Initialize MongoDB (for flexible data - logs, analytics)
    await connectMongoDB();

    // Setup WebSocket handlers (pass sequelize for model-based operations)
    setupWebSocket(io, sequelize);

    // Routes - pass the SQLite database instance
    app.use('/api/auth', createAuthRoutes(db));
    app.use('/api/users', createUserRoutes(db));
    app.use('/api/matches', createMatchRoutes(db));
    app.use('/api/admin', createAdminRoutes(db));
    app.use('/api/stadiums', createStadiumRoutes(db));
    // Football routes still need Sequelize for sync service
    app.use('/api/football', createFootballRoutes(sequelize));

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        databases: {
          sqlite: 'Connected (primary)',
          mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected'
        },
        websocket: 'Socket.IO enabled',
        stack: 'Express + SQLite + React + Node.js'
      });
    });

    // Error handling middleware
    app.use(errorHandler);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`💾 Databases:`);
      console.log(`   - SQLite (primary, relational data)`);
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
    console.log(`⚽ Football API endpoints (powered by API-Football):`);
    console.log(`   GET /api/football/upcoming - Upcoming matches (Albania, Kosovo, Europe)`);
    console.log(`   GET /api/football/live - Live matches`);
    console.log(`   GET /api/football/team/:name - Search matches by team`);
    console.log(`   GET /api/football/league/:id - Matches by league ID`);
    console.log(`   GET /api/football/leagues - Available league IDs`);
    console.log(`   POST /api/football/sync - Sync API matches into local database`);
    if (!process.env.API_FOOTBALL_KEY) {
      console.log(`   ⚠️  Set API_FOOTBALL_KEY in .env to enable (free at api-football.com)`);
    } else {
      console.log(`   ✅ API-Football is configured with key (${process.env.API_FOOTBALL_KEY.substring(0, 8)}...)`);
    }
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