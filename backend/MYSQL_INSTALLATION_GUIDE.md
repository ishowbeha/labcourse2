# MySQL 8.0 Installation Guide

## Download and Install MySQL 8.0

### Step 1: Download MySQL 8.0

1. **Go to MySQL Downloads**: https://dev.mysql.com/downloads/mysql/
2. **Select MySQL Community Server** (free version)
3. **Choose your operating system** (Windows, macOS, Linux)
4. **Download the installer** (recommended: "Windows (x86, 64-bit), MSI Installer")

### Step 2: Install MySQL 8.0

#### Windows Installation:

1. **Run the MySQL Installer**
2. **Choose Setup Type**: Select "Developer Default" (includes MySQL Server, Workbench, and connectors)
3. **Check Requirements**: Make sure all requirements are met
4. **Install Products**: Click "Execute" to install all selected products
5. **Configuration**: After installation, the MySQL Installer will prompt you to configure MySQL Server

#### MySQL Server Configuration:

1. **Config Type**: Select "Development Computer"
2. **TCP/IP**: Make sure "Enable TCP/IP Networking" is checked
3. **Port**: Use default port 3306
4. **Authentication**: Select "Use Legacy Authentication Method (Retain MySQL 5.x Compatibility)"
5. **Root Password**: Set a strong password and remember it!
6. **Apply Configuration**: Click "Execute" to apply settings

### Step 3: Verify Installation

1. **Open MySQL Workbench 8.0** (should be installed automatically)
2. **Check Connections**: You should see a connection to "Local Instance MySQL 8.0"
3. **Test Connection**: Click on the connection - it should connect successfully

### Step 4: Create Database

1. **Open MySQL Workbench**
2. **Create New Query**: Click "File" → "New Query Tab"
3. **Run SQL Command**:
   ```sql
   CREATE DATABASE stadium_tickets;
   ```
4. **Verify**: Check the "SCHEMAS" panel on the left - you should see `stadium_tickets`

### Step 5: Update Environment Variables

Edit your `.env` file in the backend folder:

```env
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=stadium_tickets
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_root_password_here

# MongoDB (optional)
MONGODB_URI=mongodb://localhost:27017/stadium_tickets

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
JWT_EXPIRES_IN=7d
```

**Important**: Replace `your_mysql_root_password_here` with the password you set during MySQL installation.

### Step 6: Test the Connection

1. **Open Command Prompt** in your backend folder
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Start the Server**:
   ```bash
   npm run dev
   ```

### Step 7: Verify Everything Works

1. **Check Console Output**: You should see "✅ MySQL connected successfully"
2. **Visit Health Check**: Open browser to `http://localhost:3000/api/health`
3. **Test API**: Try logging in with admin credentials:
   - Email: `admin@stadium.com`
   - Password: `admin123`

## Troubleshooting Installation

### Issue: "MySQL Installer not found"
- Make sure you downloaded the full MySQL Installer, not just MySQL Server
- Download from: https://dev.mysql.com/downloads/installer/

### Issue: "Port 3306 already in use"
- Check if another MySQL instance is running
- Use Task Manager to stop any MySQL processes
- Restart the installation

### Issue: "Authentication failed"
- Make sure you're using the correct root password
- Try resetting the password:
  ```sql
  ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'new_password';
  ```

### Issue: "Connection refused"
- Make sure MySQL service is running
- Check Windows Services for "MySQL80" service
- Start the service if it's stopped

## Quick Test Script

Create a file called `test-mysql-install.js` in your backend folder:

```javascript
const { Sequelize } = require('sequelize');

console.log('Testing MySQL 8.0 connection...');

const sequelize = new Sequelize('stadium_tickets', 'root', 'your_password', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL 8.0 connection successful!');
    
    await sequelize.sync();
    console.log('✅ Database tables created!');
    
    console.log('🎉 Installation complete! You can now run: npm run dev');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Make sure MySQL 8.0 is installed and running');
    console.log('2. Check your password in .env file');
    console.log('3. Verify MySQL Workbench can connect');
    console.log('4. Check if port 3306 is available');
  }
}

testConnection();
```

Replace `'your_password'` with your MySQL root password, then run:
```bash
node test-mysql-install.js
```

## After Installation

Once MySQL 8.0 is installed and working:

1. **Delete the test file**: `test-mysql-install.js`
2. **Run your server**: `npm run dev`
3. **Access the API**: Visit `http://localhost:3000/api/health`
4. **Test functionality**: Use the curl commands from the migration guide

## Support

If you're still having issues after following this guide:

1. **Share the exact error message**
2. **Tell me your operating system**
3. **Let me know if MySQL Workbench connects successfully**

The migration is complete - you just need MySQL 8.0 installed and configured properly!