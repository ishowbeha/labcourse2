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
const MongoLogService = require('./services/MongoLogService');
const MongoAnalyticsService = require('./services/MongoAnalyticsService');
const createAuthRoutes = require('./routes/authRoutes');
const createUserRoutes = require('./routes/userRoutes');
const createMatchRoutes = require('./routes/matchRoutes');
const createAdminRoutes = require('./routes/adminRoutes');
const createStadiumRoutes = require('./routes/stadiumRoutes');
const createFootballRoutes = require('./routes/footballRoutes');
const createOrderRoutes = require('./routes/orderRoutes');
const createReportRoutes = require('./routes/reportRoutes');
const createLogRoutes = require('./routes/logRoutes');
const createAnalyticsRoutes = require('./routes/analyticsRoutes');
const createReviewRoutes = require('./routes/reviewRoutes');
const createNotificationRoutes = require('./routes/notificationRoutes');
const createChatRoutes = require('./routes/chatRoutes');
const createSettingsRoutes = require('./routes/settingsRoutes');
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
    // Initialize MySQL pool (primary database via Laragon)
    console.log('🗄️ Initializing MySQL database pool...');
    const pool = await DatabaseConfig.createPool();
    
    // Make pool available to routes via req.app.get('pool')
    app.set('pool', pool);
    
    console.log('✅ MySQL pool initialized successfully');
    
    // ── Auto-generate tickets for any matches missing them ──
    try {
      const [matchCount] = await pool.query('SELECT COUNT(*) as c FROM matches');
      const [ticketCount] = await pool.query('SELECT COUNT(*) as c FROM tickets');
      if (parseInt(matchCount[0].c) > 0 && parseInt(ticketCount[0].c) === 0) {
        console.log('🎫 No tickets found — auto-generating for all matches...');
        
        // Use the standalone generation script's logic directly
        const [matches] = await pool.query(
          "SELECT id, stadium_id, base_price FROM matches WHERE status IN ('scheduled', 'live') ORDER BY id"
        );

        if (matches.length > 0) {
          const sectionDefs = [
            { name: 'North Stand',   rows: 3, seatsPerRow: 11, multiplier: 1.0 },
            { name: 'South Stand',   rows: 3, seatsPerRow: 11, multiplier: 1.0 },
            { name: 'East Stand',    rows: 3, seatsPerRow: 11, multiplier: 1.0 },
            { name: 'West Stand',    rows: 3, seatsPerRow: 11, multiplier: 1.0 },
            { name: 'VIP North',     rows: 3, seatsPerRow: 11, multiplier: 2.0 },
            { name: 'VIP South',     rows: 3, seatsPerRow: 11, multiplier: 2.0 },
          ];

          const stadiumMap = {};
          for (const m of matches) {
            if (!stadiumMap[m.stadium_id]) stadiumMap[m.stadium_id] = [];
            stadiumMap[m.stadium_id].push(m);
          }

          let totalGenerated = 0;
          for (const [stadiumId, stadiumMatches] of Object.entries(stadiumMap)) {
            const [existingSections] = await pool.query(
              'SELECT id, name, row_count, seats_per_row, price_multiplier FROM sections WHERE stadium_id = ?',
              [stadiumId]
            );
            const existingByName = {};
            for (const s of existingSections) existingByName[s.name] = s;

            const sectionsToUse = [];
            for (const def of sectionDefs) {
              let section = existingByName[def.name];
              if (!section) {
                const [res] = await pool.query(
                  `INSERT INTO sections (stadium_id, name, row_count, seats_per_row, price_multiplier, description, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                  [stadiumId, def.name, def.rows, def.seatsPerRow, def.multiplier, `Auto: ${def.name}`]
                );
                section = { id: res.insertId, name: def.name, row_count: def.rows, seats_per_row: def.seatsPerRow, price_multiplier: def.multiplier };
              }
              sectionsToUse.push(section);
            }

            for (const match of stadiumMatches) {
              for (const section of sectionsToUse) {
                const [[{exists}]] = await pool.query(
                  'SELECT COUNT(*) as `exists` FROM tickets WHERE match_id = ? AND section_id = ?',
                  [match.id, section.id]
                );
                if (parseInt(exists) > 0) continue;

                const totalSeats = section.row_count * section.seats_per_row;
                const isVip = section.name.toLowerCase().includes('vip');
                const price = isVip
                  ? Math.min(150, Math.round(match.base_price * section.price_multiplier * 100) / 100)
                  : Math.round(match.base_price * section.price_multiplier * 100) / 100;

                const tickets = [];
                for (let seatIdx = 1; seatIdx <= totalSeats; seatIdx++) {
                  const rowNum = Math.ceil(seatIdx / section.seats_per_row);
                  const seatNum = ((seatIdx - 1) % section.seats_per_row) + 1;
                  tickets.push([match.id, section.id, rowNum, seatNum, price, 'available']);
                }
                for (let i = 0; i < tickets.length; i += 500) {
                  const chunk = tickets.slice(i, i + 500);
                  const ph = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
                  await pool.query(
                    'INSERT INTO tickets (`match_id`,`section_id`,`row_number`,`seat_number`,`price`,`status`) VALUES ' + ph,
                    chunk.flat()
                  );
                  totalGenerated += chunk.length;
                }
              }
            }
          }
          console.log(`🎫 Auto-generated ${totalGenerated} tickets for ${matches.length} matches`);
        }
      } else if (parseInt(ticketCount[0].c) > 0) {
        console.log(`🎫 ${ticketCount[0].c} tickets already exist in database`);
      }
    } catch (autoGenErr) {
      console.warn('⚠️ Ticket auto-generation skipped:', autoGenErr.message);
    }

    // Initialize MongoDB (for flexible data - logs, analytics)
    await connectMongoDB();

    // Instantiate MongoDB services and attach to app
    const mongoLogService = new MongoLogService();
    const mongoAnalyticsService = new MongoAnalyticsService();
    app.set('mongoLogService', mongoLogService);
    app.set('mongoAnalyticsService', mongoAnalyticsService);
    console.log('✅ MongoDB services initialized (ActivityLog + Analytics)');

    // Setup WebSocket handlers (pass the MySQL pool)
    setupWebSocket(io, pool);

    // Routes - pass the MySQL pool
    app.use('/api/auth', createAuthRoutes(pool));
    app.use('/api/users', createUserRoutes(pool));
    app.use('/api/matches', createMatchRoutes(pool));
    app.use('/api/admin', createAdminRoutes(pool));
    app.use('/api/stadiums', createStadiumRoutes(pool));
    // Order routes (purchase tickets)
    app.use('/api/orders', createOrderRoutes(pool));

    // Log routes (MongoDB activity logging with MySQL audit_logs fallback)
    app.use('/api/logs', createLogRoutes(pool));

    // Analytics routes (MongoDB) — admin-only
    app.use('/api/analytics', createAnalyticsRoutes());

    // Report routes (activity logs from MySQL)
    app.use('/api/reports', createReportRoutes(pool));
    app.use('/api/reviews', createReviewRoutes(pool));

    // Notification routes
    app.use('/api/notifications', createNotificationRoutes(pool));

    // Chat routes (contacts + conversation history)
    app.use('/api/chat', createChatRoutes(pool));

    // Settings routes (admin only)
    app.use('/api/admin/settings', createSettingsRoutes(pool));

    // Public settings route (non-sensitive keys only, accessible to guests and users)
    const SettingsController = require('./controllers/SettingsController');
    const settingsController = new SettingsController(pool);
    app.get('/api/settings', (req, res, next) => settingsController.getPublicSettings(req, res, next));

    // Football routes still need Sequelize for sync service
    app.use('/api/football', createFootballRoutes(sequelize));

    // TEST endpoint: Verify MongoDB is writing data (open in browser or Compass)
    app.get('/api/mongo-test', async (req, res) => {
      try {
        const mongoLog = req.app.get('mongoLogService');
        const mongoAnalytics = req.app.get('mongoAnalyticsService');

        if (!mongoLog || !mongoAnalytics || mongoose.connection.readyState !== 1) {
          return res.json({
            success: false,
            message: 'MongoDB is not connected. Check that MongoDB is running on your machine.',
            mongodbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected',
            hint: 'Open MongoDB Compass and connect to mongodb://localhost:27017 — the "stadium_tickets" database should appear after this test.'
          });
        }

        // Write a test activity log
        await mongoLog.logActivity(
          'test-user',
          'test_action',
          'test',
          'test-123',
          'MongoDB test write from server startup',
          { test: true, timestamp: new Date().toISOString() }
        );

        // Write a test analytics event
        await mongoAnalytics.trackPageView('/api/mongo-test', null, 'test-session');

        // Read back what we wrote
        const activities = await mongoLog.getRecentActivities(5, 0);
        const metrics = await mongoAnalytics.getAnalytics(30);

        res.json({
          success: true,
          message: '✅ MongoDB is working! Data written and read successfully.',
          mongodbStatus: 'Connected',
          whatHappened: 'A test activity log + analytics event were written to MongoDB',
          howToVerify: 'Open MongoDB Compass → Connect to localhost:27017 → Look for database "stadium_tickets" with collections: activity_logs, analytics, systeminfos',
          recentActivities: activities,
          analyticsMetrics: metrics
        });
      } catch (error) {
        res.json({
          success: false,
          message: 'MongoDB test failed. See error below.',
          error: error.message,
          hint: 'Make sure MongoDB is running on your machine (mongod service)'
        });
      }
    });

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        databases: {
          mysql: 'Connected (primary via Laragon)',
          mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected'
        },
        websocket: 'Socket.IO enabled',
        stack: 'Express + MySQL + React + Node.js'
      });
    });

    // Error handling middleware
    app.use(errorHandler);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`💾 Databases:`);
      console.log(`   - MySQL (primary, relational data via Laragon)`);
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
    console.log(`⚽ Football API endpoints (powered by TheSportsDB):`);
    console.log(`   GET /api/football/upcoming - Upcoming matches (World Cup, Europe, leagues)`);
    console.log(`   GET /api/football/live - Live matches`);
    console.log(`   GET /api/football/team/:name - Search matches by team`);
    console.log(`   GET /api/football/competition/:id - Matches by league ID`);
    console.log(`   GET /api/football/competitions - Available competition IDs`);
    console.log(`   POST /api/football/sync - Sync API matches into local database`);
    console.log(`   ✅ TheSportsDB API is configured with free key`);
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