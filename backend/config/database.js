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
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
        isActive INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create categories table
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create triggers for updated_at
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
      AFTER UPDATE ON users 
      BEGIN 
        UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; 
      END
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_categories_updated_at 
      AFTER UPDATE ON categories 
      BEGIN 
        UPDATE categories SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; 
      END
    `);

    // Insert sample data
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
    if (categoryCount.count === 0) {
      const insertCategory = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
      insertCategory.run('Electronics', 'Electronic devices and gadgets');
      insertCategory.run('Books', 'Books and literature');
      insertCategory.run('Clothing', 'Apparel and fashion items');
      insertCategory.run('Food', 'Food and beverages');
      insertCategory.run('Sports', 'Sports equipment and accessories');
      console.log('✅ Sample categories inserted');
    }

    console.log('✅ Database migrations completed');
  }
}

module.exports = DatabaseConfig;