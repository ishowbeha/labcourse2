require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const DatabaseConfig = require('../config/database');
const errorHandler = require('./middleware/errorHandler');
const createAuthRoutes = require('./routes/authRoutes');
const createUserRoutes = require('./routes/userRoutes');
const createMatchRoutes = require('./routes/matchRoutes');
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

// Initialize database and start server
const startServer = () => {
  try {
    // Initialize SQLite database with migrations
    const db = DatabaseConfig.init();
    DatabaseConfig.runMigrations(db);
    DatabaseConfig.seedData(db);

    // Make database available to routes
    app.set('db', db);

    // Setup WebSocket handlers
    setupWebSocket(io, db);

    // Routes
    app.use('/api/auth', createAuthRoutes(db));
    app.use('/api/users', createUserRoutes(db));
    app.use('/api/matches', createMatchRoutes(db));

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        database: 'SQLite (file-based)',
        websocket: 'Socket.IO enabled'
      });
    });

    // Error handling middleware
    app.use(errorHandler);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`💾 Database: SQLite (file-based, no installation needed)`);
      console.log(`🔌 WebSocket: Socket.IO enabled at http://localhost:${PORT}`);
      console.log(`🔐 Auth endpoints:`);
      console.log(`   POST /api/auth/register - Register new user`);
      console.log(`   POST /api/auth/login - User login`);
      console.log(`   GET /api/auth/profile - Get user profile (requires auth)`);
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