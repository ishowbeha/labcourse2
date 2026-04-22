# Laragon Setup Guide for MySQL

## Why Use Laragon?

Laragon is perfect for your project because:
- ✅ **Includes MySQL** (no separate installation needed)
- ✅ **Easy to use** with a simple interface
- ✅ **Auto-configuration** - handles all the setup
- ✅ **Local development** optimized
- ✅ **Includes PHPMyAdmin** for database management

## Step 1: Download and Install Laragon

1. **Download Laragon**: https://laragon.org/download/
2. **Choose Version**: Download "Laragon Full" (includes MySQL, PHP, Apache/Nginx)
3. **Install**: Run the installer with default settings
4. **Launch**: Open Laragon after installation

## Step 2: Start MySQL with Laragon

1. **Open Laragon**
2. **Click "Start All"** (green button) - this starts MySQL automatically
3. **Verify MySQL is running**: You should see "MySQL" in green in the services list
4. **Default credentials**:
   - Host: `localhost`
   - Port: `3306`
   - Username: `root`
   - Password: *(empty/blank)*

## Step 3: Create Your Database

### Option A: Using Laragon's PHPMyAdmin

1. **In Laragon, click "Web" → "phpMyAdmin"**
2. **Create database**: Click "New" → Enter name: `stadium_tickets` → Click "Create"

### Option B: Using Laragon's MySQL Console

1. **In Laragon, click "DB" → "MySQL"**
2. **Run this command**:
   ```sql
   CREATE DATABASE stadium_tickets;
   ```

## Step 4: Update Your .env File

Edit your `backend/.env` file:

```env
PORT=3000
NODE_ENV=development

# MySQL Database Configuration (Laragon)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=stadium_tickets
MYSQL_USER=root
MYSQL_PASSWORD=

# MongoDB (optional)
MONGODB_URI=mongodb://localhost:27017/stadium_tickets

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
JWT_EXPIRES_IN=7d
```

**Note**: Leave `MYSQL_PASSWORD` empty (Laragon's MySQL has no password by default)

## Step 5: Test the Connection

1. **Make sure Laragon is running** (MySQL should be green)
2. **Open command prompt** in your backend folder
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start your server**:
   ```bash
   npm run dev
   ```

## Step 6: Verify Everything Works

You should see in your console:
```
✅ MySQL connected successfully
✅ MySQL models synchronized
🚀 Server running on port 3000
```

## Troubleshooting Laragon Issues

### Issue: "MySQL not starting"
- **Solution**: In Laragon, click "Restart All" or check if port 3306 is free

### Issue: "Connection refused"
- **Solution**: Make sure Laragon's MySQL service is running (should be green)

### Issue: "Access denied"
- **Solution**: Use empty password for root user (default in Laragon)

### Issue: "Database doesn't exist"
- **Solution**: Create the database using PHPMyAdmin or MySQL console as shown above

## Using PHPMyAdmin with Laragon

Laragon includes PHPMyAdmin for easy database management:

1. **Open PHPMyAdmin**: In Laragon → "Web" → "phpMyAdmin"
2. **Manage databases**: Create, modify, and manage your MySQL databases
3. **View data**: See all your tables and data visually
4. **Run SQL**: Execute custom SQL queries

## Quick Test

Create a test file `test-laragon.js` in your backend folder:

```javascript
const { Sequelize } = require('sequelize');

console.log('Testing Laragon MySQL connection...');

const sequelize = new Sequelize('stadium_tickets', 'root', '', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Laragon MySQL connection successful!');
    
    await sequelize.sync();
    console.log('✅ Database tables created!');
    
    console.log('🎉 Laragon setup complete! You can now run: npm run dev');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure Laragon is running and MySQL is green');
    console.log('2. Check that stadium_tickets database exists');
    console.log('3. Verify your .env file has correct settings');
  }
}

testConnection();
```

Run it with: `node test-laragon.js`

## Benefits of Using Laragon

1. **No complex installation** - everything is pre-configured
2. **Easy management** - start/stop services with one click
3. **Built-in tools** - PHPMyAdmin, file manager, etc.
4. **Development optimized** - perfect for local development
5. **Multiple projects** - can run multiple projects easily

## Next Steps

Once Laragon is set up:

1. **Delete the test file** if you created it
2. **Run your server**: `npm run dev`
3. **Access your API**: Visit `http://localhost:3000/api/health`
4. **Test functionality**: Use the admin credentials:
   - Email: `admin@stadium.com`
   - Password: `admin123`

Laragon makes MySQL development much easier than installing MySQL separately. Give it a try!