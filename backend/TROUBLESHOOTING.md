# MySQL Connection Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: MySQL Server Not Running

**Error:** "Connection refused" or "ECONNREFUSED"

**Solution:**
1. Open MySQL Workbench
2. Check if your connection is active (green dot next to connection name)
3. If not connected, click on your connection to connect
4. If connection fails, MySQL server might not be running

**Start MySQL Server:**
- **Windows:** Open Services (services.msc) → Find "MySQL80" → Start the service
- **macOS:** Open System Preferences → MySQL → Start MySQL Server
- **Linux:** `sudo systemctl start mysql`

### Issue 2: Wrong Credentials

**Error:** "Access denied" or "ER_ACCESS_DENIED_ERROR"

**Solution:**
1. Open MySQL Workbench
2. Try connecting with your credentials
3. If connection fails, reset your MySQL root password:

```sql
-- In MySQL Workbench, run:
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_new_password';
FLUSH PRIVILEGES;
```

4. Update your `.env` file with the correct password

### Issue 3: Database Doesn't Exist

**Error:** "Unknown database 'stadium_tickets'"

**Solution:**
1. Open MySQL Workbench
2. Create a new query tab
3. Run: `CREATE DATABASE stadium_tickets;`
4. Verify it appears in the SCHEMAS panel

### Issue 4: Port Already in Use

**Error:** "Port 3306 is already in use"

**Solution:**
1. Check what's using port 3306: `netstat -ano | findstr :3306`
2. If another MySQL instance is running, use a different port
3. Update `.env` file:
   ```env
   MYSQL_PORT=3307  # or another available port
   ```

### Issue 5: Authentication Plugin Issue

**Error:** "ER_NOT_SUPPORTED_AUTH_MODE"

**Solution:**
1. Open MySQL Workbench
2. Run this SQL command:
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
   FLUSH PRIVILEGES;
   ```
3. Restart MySQL server

## Testing MySQL Connection

### Test 1: Can you connect via MySQL Workbench?
1. Open MySQL Workbench
2. Click on your connection
3. If successful, you should see the MySQL dashboard

### Test 2: Can you create a database?
1. In MySQL Workbench, create a new query
2. Run: `CREATE DATABASE test_db;`
3. Check if it appears in SCHEMAS

### Test 3: Can you connect via command line?
```bash
mysql -u root -p
SHOW DATABASES;
EXIT;
```

## Debug Steps

### Step 1: Verify MySQL Installation
```bash
# Check if MySQL is installed and running
mysql --version
```

### Step 2: Check MySQL Status
```bash
# Windows
net start | findstr MySQL

# macOS/Linux
sudo systemctl status mysql
```

### Step 3: Test Connection
```bash
# Test MySQL connection
mysql -h localhost -P 3306 -u root -p
```

### Step 4: Check Database
```sql
-- In MySQL, check if database exists
SHOW DATABASES;
USE stadium_tickets;
SHOW TABLES;
```

## Environment Variables Check

Make sure your `.env` file has correct values:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=stadium_tickets
MYSQL_USER=root
MYSQL_PASSWORD=your_actual_password
```

**Common mistakes:**
- Wrong password
- Wrong port (should be 3306 for default MySQL)
- Wrong database name
- Extra spaces in values

## If Nothing Works

### Option 1: Reset Everything
1. Stop MySQL server
2. Delete the database: `DROP DATABASE stadium_tickets;`
3. Restart MySQL server
4. Recreate database: `CREATE DATABASE stadium_tickets;`
5. Update `.env` with correct credentials
6. Restart your Node.js server

### Option 2: Use Different Port
If port 3306 is problematic:
1. Change MySQL port in MySQL configuration
2. Update `.env` file with new port
3. Restart MySQL and Node.js server

### Option 3: Check Firewall
Make sure your firewall isn't blocking MySQL connections on port 3306.

## Getting Help

If you're still having issues:

1. **Check MySQL logs** for specific error messages
2. **Share the exact error message** you're getting
3. **Verify your MySQL version** (should be 8.0+)
4. **Check if other applications** can connect to MySQL

## Quick Fix Script

Create a file called `test-mysql.js` in your backend folder:

```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('stadium_tickets', 'root', '', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql'
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connection successful!');
    
    // Test database creation
    await sequelize.sync();
    console.log('✅ Database tables created!');
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    console.error('Error details:', error);
  }
}

testConnection();
```

Run it with: `node test-mysql.js`

This will give you specific error details.