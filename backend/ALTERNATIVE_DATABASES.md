# Alternative Database Options

Since MySQL is giving you trouble, here are easier alternatives:

## Option 1: PostgreSQL (Recommended Alternative)

PostgreSQL is easier to set up and more developer-friendly than MySQL.

### Install PostgreSQL:

1. **Download**: https://www.postgresql.org/download/
2. **Install**: Use the default settings
3. **Default credentials**:
   - Username: `postgres`
   - Password: (the password you set during installation)
   - Port: `5432`

### Update package.json:
```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "sequelize": "^6.37.8"
  }
}
```

### Update .env:
```env
# PostgreSQL Configuration
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stadium_tickets
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

### Update config/postgres.js:
```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'stadium_tickets',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  }
);

async function connectPostgres() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
}

module.exports = { sequelize, connectPostgres };
```

## Option 2: Simple SQLite (Easiest)

If you want the simplest solution, we can use SQLite with a cleaner setup.

### Update package.json:
```json
{
  "dependencies": {
    "better-sqlite3": "^12.8.0",
    "sqlite3": "^5.1.7"
  }
}
```

### Update .env:
```env
# SQLite Configuration
DB_PATH=./data/database.sqlite
```

### Update config/sqlite.js:
```javascript
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initSQLite() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const dbPath = process.env.DB_PATH || path.join(dataDir, 'database.sqlite');
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  
  console.log('✅ SQLite connected successfully');
  return db;
}

module.exports = { initSQLite };
```

## Option 3: MongoDB Only

Use MongoDB for everything (no relational database).

### Update .env:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/stadium_tickets
```

### Create MongoDB models instead of SQL models.

## Quick Fix: Revert to Original SQLite

If you want to go back to the original setup:

1. **Restore original package.json** (add back better-sqlite3)
2. **Use original server.js** (with SQLite)
3. **Keep your frontend changes**

## Recommendation

I recommend **PostgreSQL** because:
- Easier to install and configure
- Better error messages
- More developer-friendly
- Still gives you the benefits of a proper database

Would you like me to:
1. Set up PostgreSQL configuration for you?
2. Revert to simple SQLite?
3. Help you with a different database option?

Let me know which option you'd prefer, and I'll set it up for you!