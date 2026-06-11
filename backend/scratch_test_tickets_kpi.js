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

    // Test Global (All Matches)
    const matchConstraintGlobal = "WHERE m.status IN ('scheduled', 'live')";
    const [[kpiGlobal]] = await conn.query(`
      SELECT
        CAST(COALESCE(SUM(capacity), 0) AS SIGNED) as total_tickets,
        CAST(COALESCE(SUM(GREATEST(0, CAST(capacity AS SIGNED) - CAST(sold AS SIGNED) - CAST(reserved AS SIGNED))), 0) AS SIGNED) as available,
        CAST(COALESCE(SUM(sold), 0) AS SIGNED) as sold,
        CAST(COALESCE(SUM(reserved), 0) AS SIGNED) as reserved,
        CAST(COALESCE(SUM(revenue), 0) AS DECIMAL(12,2)) as revenue
      FROM (
        SELECT
          m.id,
          (SELECT COALESCE(SUM(s.row_count * s.seats_per_row), 0) FROM sections s WHERE s.stadium_id = m.stadium_id) as capacity,
          (
            SELECT COUNT(*) FROM tickets t WHERE t.match_id = m.id AND t.status = 'sold'
          ) + (
            SELECT COALESCE(SUM(oi.quantity), 0)
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            WHERE oi.ticket_id IS NULL
              AND o.status IN ('paid', 'confirmed', 'completed')
              AND o.notes LIKE CONCAT('%Match: ', m.home_team, ' vs ', m.away_team, '%')
          ) as sold,
          (
            SELECT COUNT(*) FROM tickets t WHERE t.match_id = m.id AND t.status = 'reserved'
          ) as reserved,
          (
            SELECT COALESCE(SUM(t.price), 0) FROM tickets t WHERE t.match_id = m.id AND t.status = 'sold'
          ) + (
            SELECT COALESCE(SUM(oi.subtotal), 0)
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            WHERE oi.ticket_id IS NULL
              AND o.status IN ('paid', 'confirmed', 'completed')
              AND o.notes LIKE CONCAT('%Match: ', m.home_team, ' vs ', m.away_team, '%')
          ) as revenue
        FROM matches m
        ${matchConstraintGlobal}
      ) sub
    `);

    console.log('Global KPI:', kpiGlobal);

    // Test Specific Match (Match ID 12)
    const matchConstraintMatch = "WHERE m.id = ?";
    const [[kpiMatch]] = await conn.query(`
      SELECT
        CAST(COALESCE(SUM(capacity), 0) AS SIGNED) as total_tickets,
        CAST(COALESCE(SUM(GREATEST(0, CAST(capacity AS SIGNED) - CAST(sold AS SIGNED) - CAST(reserved AS SIGNED))), 0) AS SIGNED) as available,
        CAST(COALESCE(SUM(sold), 0) AS SIGNED) as sold,
        CAST(COALESCE(SUM(reserved), 0) AS SIGNED) as reserved,
        CAST(COALESCE(SUM(revenue), 0) AS DECIMAL(12,2)) as revenue
      FROM (
        SELECT
          m.id,
          (SELECT COALESCE(SUM(s.row_count * s.seats_per_row), 0) FROM sections s WHERE s.stadium_id = m.stadium_id) as capacity,
          (
            SELECT COUNT(*) FROM tickets t WHERE t.match_id = m.id AND t.status = 'sold'
          ) + (
            SELECT COALESCE(SUM(oi.quantity), 0)
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            WHERE oi.ticket_id IS NULL
              AND o.status IN ('paid', 'confirmed', 'completed')
              AND o.notes LIKE CONCAT('%Match: ', m.home_team, ' vs ', m.away_team, '%')
          ) as sold,
          (
            SELECT COUNT(*) FROM tickets t WHERE t.match_id = m.id AND t.status = 'reserved'
          ) as reserved,
          (
            SELECT COALESCE(SUM(t.price), 0) FROM tickets t WHERE t.match_id = m.id AND t.status = 'sold'
          ) + (
            SELECT COALESCE(SUM(oi.subtotal), 0)
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            WHERE oi.ticket_id IS NULL
              AND o.status IN ('paid', 'confirmed', 'completed')
              AND o.notes LIKE CONCAT('%Match: ', m.home_team, ' vs ', m.away_team, '%')
          ) as revenue
        FROM matches m
        ${matchConstraintMatch}
      ) sub
    `, [12]);

    console.log('Match 12 KPI:', kpiMatch);

  } catch(e) {
    console.error('Error running test:', e.message, e.stack);
  } finally {
    if (conn) await conn.end();
  }
}
run();
