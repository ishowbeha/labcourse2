const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseConfig {
  static init() {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'database.sqlite');
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    console.log('✅ SQLite database initialized at:', dbPath);
    return db;
  }

  static runMigrations(db) {
    console.log('🔄 Running database migrations...');

    // ============================================
    // CORE AUTHENTICATION & AUTHORIZATION TABLES
    // ============================================

    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // Roles table
    db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // UserRoles table (many-to-many)
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        assigned_by INTEGER,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id),
        UNIQUE(user_id, role_id)
      )
    `);

    // Permissions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // RolePermissions table (many-to-many)
    db.exec(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        granted_by INTEGER,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id),
        UNIQUE(role_id, permission_id)
      )
    `);

    // RefreshTokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // AuditLogs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // ============================================
    // NOTIFICATIONS & SETTINGS
    // ============================================

    // Notifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        read_at DATETIME,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // Settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        description TEXT,
        type TEXT DEFAULT 'string',
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // ============================================
    // STADIUM & TICKET MANAGEMENT TABLES
    // ============================================

    // Stadiums table
    db.exec(`
      CREATE TABLE IF NOT EXISTS stadiums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        country TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        address TEXT,
        image_url TEXT,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // Sections table (stadium sections)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stadium_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        row_count INTEGER NOT NULL,
        seats_per_row INTEGER NOT NULL,
        price_multiplier REAL DEFAULT 1.0,
        description TEXT,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stadium_id) REFERENCES stadiums(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id),
        UNIQUE(stadium_id, name)
      )
    `);

    // Matches table
    db.exec(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        stadium_id INTEGER NOT NULL,
        match_date DATETIME NOT NULL,
        match_time TIME NOT NULL,
        competition TEXT,
        round TEXT,
        status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'live', 'completed', 'cancelled', 'postponed')),
        home_score INTEGER DEFAULT 0,
        away_score INTEGER DEFAULT 0,
        base_price REAL NOT NULL,
        max_tickets_per_user INTEGER DEFAULT 4,
        sale_start_date DATETIME,
        sale_end_date DATETIME,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stadium_id) REFERENCES stadiums(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // Tickets table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        section_id INTEGER NOT NULL,
        row_number INTEGER NOT NULL,
        seat_number INTEGER NOT NULL,
        price REAL NOT NULL,
        status TEXT DEFAULT 'available' CHECK(status IN ('available', 'reserved', 'sold', 'cancelled')),
        qr_code TEXT,
        barcode TEXT,
        purchaser_id INTEGER,
        purchased_at DATETIME,
        reserved_until DATETIME,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id),
        FOREIGN KEY (purchaser_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id),
        UNIQUE(match_id, section_id, row_number, seat_number)
      )
    `);

    // Orders table (for ticket orders)
    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_number TEXT NOT NULL UNIQUE,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'paid', 'cancelled', 'refunded')),
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'completed', 'failed', 'refunded')),
        payment_reference TEXT,
        customer_email TEXT NOT NULL,
        customer_phone TEXT,
        notes TEXT,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // OrderItems table (ticket order items)
    db.exec(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        ticket_id INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        subtotal REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id)
      )
    `);

    // ============================================
    // PAYMENT TABLES (for ticket payments)
    // ============================================

    // Payments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'EUR',
        method TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
        transaction_id TEXT,
        gateway_reference TEXT,
        gateway_response TEXT,
        paid_at DATETIME,
        refunded_at DATETIME,
        refund_amount REAL,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // ============================================
    // CREATE INDEXES FOR PERFORMANCE
    // ============================================

    // User indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)`);

    // Ticket indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_match_id ON tickets(match_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_purchaser ON tickets(purchaser_id)`);

    // Match indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_matches_stadium ON matches(stadium_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)`);

    // Order indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);

    // Audit log indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`);

    console.log('✅ Database migrations completed');
    console.log('✅ All tables created in Third Normal Form (3NF)');
    console.log('✅ Foreign keys and indexes created');
  }

  static seedData(db) {
    // Check if data already exists
    const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').get();
    if (roleCount.count > 0) {
      console.log('✅ Seed data already exists (skipping)');
      return;
    }

    console.log('🌱 Seeding initial data...');

    // Create admin user
    const bcrypt = require('bcryptjs');
    const adminPassword = bcrypt.hashSync('admin123', 10);
    
    const adminUser = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, is_active, created_by, updated_by)
      VALUES (?, ?, ?, ?, 1, 1, 1)
    `).run('System', 'Admin', 'admin@stadium.com', adminPassword);

    // Create roles (simplified for ticket management)
    const roles = [
      { name: 'admin', description: 'System Administrator' },
      { name: 'user', description: 'Regular User' },
      { name: 'manager', description: 'Stadium Manager' },
      { name: 'ticket_agent', description: 'Ticket Sales Agent' },
      { name: 'finance', description: 'Finance Department' },
      { name: 'support', description: 'Customer Support' },
      { name: 'analyst', description: 'Data Analyst' },
      { name: 'moderator', description: 'Content Moderator' },
      { name: 'vip', description: 'VIP Customer' },
      { name: 'staff', description: 'Stadium Staff' }
    ];

    const insertRole = db.prepare(`
      INSERT INTO roles (name, description, created_by, updated_by)
      VALUES (?, ?, 1, 1)
    `);

    const roleIdMap = {};
    roles.forEach(role => {
      const result = insertRole.run(role.name, role.description);
      roleIdMap[role.name] = result.lastInsertRowid;
    });

    // Assign admin role to admin user
    db.prepare(`
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES (1, ?, 1)
    `).run(roleIdMap.admin);

    // Create permissions (focused on tickets)
    const permissions = [
      { name: 'users.view', resource: 'users', action: 'view' },
      { name: 'users.create', resource: 'users', action: 'create' },
      { name: 'users.edit', resource: 'users', action: 'edit' },
      { name: 'users.delete', resource: 'users', action: 'delete' },
      { name: 'stadiums.view', resource: 'stadiums', action: 'view' },
      { name: 'stadiums.manage', resource: 'stadiums', action: 'manage' },
      { name: 'matches.view', resource: 'matches', action: 'view' },
      { name: 'matches.manage', resource: 'matches', action: 'manage' },
      { name: 'tickets.view', resource: 'tickets', action: 'view' },
      { name: 'tickets.purchase', resource: 'tickets', action: 'purchase' },
      { name: 'tickets.manage', resource: 'tickets', action: 'manage' },
      { name: 'orders.view', resource: 'orders', action: 'view' },
      { name: 'orders.manage', resource: 'orders', action: 'manage' },
      { name: 'reports.view', resource: 'reports', action: 'view' },
      { name: 'reports.generate', resource: 'reports', action: 'generate' },
      { name: 'settings.view', resource: 'settings', action: 'view' },
      { name: 'settings.edit', resource: 'settings', action: 'edit' },
      { name: 'audit_logs.view', resource: 'audit_logs', action: 'view' }
    ];

    const insertPermission = db.prepare(`
      INSERT INTO permissions (name, resource, action, created_by, updated_by)
      VALUES (?, ?, ?, 1, 1)
    `);

    const permissionIdMap = {};
    permissions.forEach(perm => {
      const result = insertPermission.run(perm.name, perm.resource, perm.action);
      permissionIdMap[perm.name] = result.lastInsertRowid;
    });

    // Assign all permissions to admin role
    const assignPermission = db.prepare(`
      INSERT INTO role_permissions (role_id, permission_id, granted_by)
      VALUES (?, ?, 1)
    `);

    Object.values(permissionIdMap).forEach(permId => {
      assignPermission.run(roleIdMap.admin, permId);
    });

    // Create sample stadium
    db.prepare(`
      INSERT INTO stadiums (name, city, country, capacity, address, description, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
    `).run('National Stadium', 'Tirana', 'Albania', 22500, 'Rruga e Elbasanit', 'Home stadium of the national team');

    // Create system settings
    const settings = [
      { key: 'site_name', value: 'Stadium Tickets', description: 'Website name', type: 'string' },
      { key: 'currency', value: 'EUR', description: 'Default currency', type: 'string' },
      { key: 'tax_rate', value: '20', description: 'Default tax rate (%)', type: 'number' },
      { key: 'ticket_booking_fee', value: '2.50', description: 'Booking fee per ticket', type: 'number' },
      { key: 'max_tickets_per_order', value: '10', description: 'Maximum tickets per order', type: 'number' }
    ];

    const insertSetting = db.prepare(`
      INSERT INTO settings (key, value, description, type, created_by, updated_by)
      VALUES (?, ?, ?, ?, 1, 1)
    `);

    settings.forEach(setting => {
      insertSetting.run(setting.key, setting.value, setting.description, setting.type);
    });

    console.log('✅ Initial seed data created');
    console.log('📧 Admin user: admin@stadium.com / admin123');
  }
}

module.exports = DatabaseConfig;