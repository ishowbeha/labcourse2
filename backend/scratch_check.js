const mysql = require('mysql2/promise');
require('dotenv').config();

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

    const [orders] = await conn.execute('SELECT id, user_id, order_number, total_amount, status, notes FROM orders');
    console.log('--- Orders ---');
    console.log(JSON.stringify(orders, null, 2));

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    if (conn) await conn.end();
  }
}
run();
