const mysql = require('mysql2/promise');

class DatabaseConfig {
  static async createPool() {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'stadium_tickets',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    // Test the connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL pool connected successfully');
    connection.release();

    return pool;
  }
}

module.exports = DatabaseConfig;