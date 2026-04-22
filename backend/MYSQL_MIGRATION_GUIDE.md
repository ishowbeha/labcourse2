# MySQL Migration Guide

## Overview
This project has been migrated from SQLite to MySQL as the primary database. The migration uses Sequelize ORM for modern, maintainable database operations.

## What Changed

### 1. Database Configuration
- **Before**: SQLite with better-sqlite3
- **After**: MySQL with Sequelize ORM

### 2. Models
- **Before**: Raw SQL queries with SQLite
- **After**: Sequelize models with associations and relationships

### 3. Repositories
- **Before**: Synchronous methods with SQLite prepared statements
- **After**: Asynchronous methods with Sequelize ORM

### 4. Dependencies
- Removed: `better-sqlite3`
- Kept: `mysql2`, `sequelize`

## Setup Instructions

### Prerequisites
1. **MySQL Server**: Install MySQL 8.0 or later (MySQL Workbench 8.0 is recommended)
2. **Node.js**: Version 14 or later
3. **npm**: Comes with Node.js

### Step 1: Create MySQL Database

#### Using MySQL Workbench 8.0:

1. **Open MySQL Workbench 8.0**
2. **Connect to your MySQL Server** (usually localhost:3306)
3. **Click on "File" → "New Query Tab"** or click the SQL icon
4. **Copy and paste this SQL command:**
   ```sql
   CREATE DATABASE stadium_tickets;
   ```
5. **Click the lightning bolt icon** (Execute) or press Ctrl+Enter
6. **Verify creation** by refreshing the "SCHEMAS" panel on the left

#### Alternative Method - Using the GUI:

1. **In MySQL Workbench, look at the left sidebar under "SCHEMAS"**
2. **Right-click in the SCHEMAS area**
3. **Select "Create Schema..."**
4. **Name it:** `stadium_tickets`
5. **Click "Apply"**
6. **Click "Finish"**

#### Using MySQL Command Line:

```bash
mysql -u root -p
CREATE DATABASE stadium_tickets;
EXIT;
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and set your MySQL credentials:
```env
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=stadium_tickets
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password

# MongoDB (optional, for logs and analytics)
MONGODB_URI=mongodb://localhost:27017/stadium_tickets

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
```

### Step 3: Install Dependencies

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

### Step 4: Start the Server

```bash
npm run dev
```

The server will:
1. Connect to MySQL
2. Create all tables automatically (using Sequelize sync)
3. Seed initial data (admin user, roles, permissions, stadiums, matches)
4. Start the Express server

### Step 5: Verify Migration

1. Check the console output for successful connection messages
2. Visit `http://localhost:3000/api/health` to verify the server is running
3. Test the API with the admin credentials:
   - Email: `admin@stadium.com`
   - Password: `admin123`

## Database Schema

### Core Tables
- `users` - User accounts
- `roles` - User roles (admin, user, manager, etc.)
- `permissions` - System permissions
- `user_roles` - Many-to-many relationship between users and roles
- `role_permissions` - Many-to-many relationship between roles and permissions

### Stadium & Ticket Management
- `stadiums` - Stadium information
- `sections` - Stadium sections
- `matches` - Match events
- `tickets` - Individual tickets
- `orders` - Ticket orders
- `order_items` - Items in an order
- `payments` - Payment records

### System Tables
- `refresh_tokens` - JWT refresh tokens
- `audit_logs` - System audit trail
- `notifications` - User notifications
- `settings` - System settings

## Testing the Migration

### Test User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Test User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@stadium.com",
    "password": "admin123"
  }'
```

### Test Get Stadiums
```bash
curl http://localhost:3000/api/stadiums
```

## Troubleshooting

### Connection Refused
If you see "Connection refused" errors:
1. Make sure MySQL server is running
2. Check that the credentials in `.env` are correct
3. Verify MySQL is listening on the correct port (default: 3306)

### Authentication Failed
If you see "ER_NOT_SUPPORTED_AUTH_MODE" or authentication errors:
1. Open MySQL Workbench
2. Run: `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';`
3. Restart MySQL service

### Tables Not Created
If tables are not created automatically:
1. Delete the database: `DROP DATABASE stadium_tickets;`
2. Recreate it: `CREATE DATABASE stadium_tickets;`
3. Restart the server

### Port Already in Use
If port 3000 is already in use:
1. Change the PORT in `.env` to another port (e.g., 3001)
2. Restart the server

## Migration Benefits

1. **Scalability**: MySQL can handle much larger datasets than SQLite
2. **Concurrency**: Better support for multiple simultaneous connections
3. **Security**: Enhanced security features and user management
4. **Reliability**: ACID compliance and transaction support
5. **Performance**: Optimized query execution and indexing
6. **Modern ORM**: Sequelize provides type safety and easier maintenance

## Support

If you encounter any issues during the migration:
1. Check the console logs for error messages
2. Verify your MySQL configuration
3. Ensure all dependencies are installed correctly
4. Review the Sequelize documentation: https://sequelize.org/

## Next Steps

After successful migration:
1. Update your frontend API calls if needed
2. Test all functionality thoroughly
3. Set up proper backups for your MySQL database
4. Consider setting up a staging environment
5. Plan for production deployment

---

**Note**: This migration is complete and the application is ready to use with MySQL as the primary database.