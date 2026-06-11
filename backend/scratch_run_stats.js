const mysql = require('mysql2/promise');
require('dotenv').config();
const AdminRepository = require('./src/repositories/AdminRepository');

const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: MYSQL_HOST || 'localhost',
      port: parseInt(MYSQL_PORT || '3306'),
      user: MYSQL_USER || 'root',
      password: MYSQL_PASSWORD || '',
      database: MYSQL_DATABASE || 'stadium_tickets'
    });

    const repo = new AdminRepository(conn);
    const stats = await repo.getDashboardStats();
    console.log('Stats:', stats);

  } catch(e) {
    console.error('Error running getDashboardStats:', e.message, e.stack);
  } finally {
    if (conn) await conn.end();
  }
}
run();
