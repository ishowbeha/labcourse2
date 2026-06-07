const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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

    const [r1] = await conn.execute(
      'UPDATE settings SET value = ? WHERE `key` = ?',
      ['admin@stadium.com', 'admin_email']
    );
    console.log('admin_email updated:', r1.affectedRows, 'rows');

    const [rows] = await conn.execute(
      'SELECT `key`, value FROM settings ORDER BY category, `key`'
    );
    console.log('\n--- Current Settings ---');
    rows.forEach(r => console.log(`  ${r.key} = ${r.value}`));
    console.log('------------------------\n');
  } catch(e) {
    console.error('DB error:', e.message);
  } finally {
    if (conn) await conn.end();
  }
}
run();
