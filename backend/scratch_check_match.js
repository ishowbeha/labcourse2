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

    const [matches] = await conn.execute('SELECT id, home_team, away_team FROM matches WHERE home_team LIKE "%Germany%" OR away_team LIKE "%Germany%" OR home_team LIKE "%Spain%" OR away_team LIKE "%Spain%"');
    console.log('Matches:', matches);

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    if (conn) await conn.end();
  }
}
run();
