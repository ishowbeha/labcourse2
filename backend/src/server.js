require('dotenv').config();
const express = require('express');
const cors = require('cors');
const DatabaseConfig = require('../config/database');
const errorHandler = require('./middleware/errorHandler');
const createAuthRoutes = require('./routes/authRoutes');
const createUserRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

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

    // Routes
    app.use('/api/auth', createAuthRoutes(db));
    app.use('/api/users', createUserRoutes(db));

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        database: 'SQLite (file-based)'
      });
    });

    // Error handling middleware
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`💾 Database: SQLite (file-based, no installation needed)`);
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