/**
 * fix_vip_prices.js
 * Run with: node fix_vip_prices.js
 *
 * 1. Reports current ticket counts and VIP prices
 * 2. Updates ALL available VIP tickets to €150 (matching Tickets.jsx)
 * 3. Reports the final counts
 */

const mysql = require('mysql2/promise');

const DB = {
  host:     'localhost',
  port:     3306,
  user:     'root',
  password: '',
  database: 'stadium_tickets',
};

// Same getVipPrice logic as AdminController.js / Tickets.jsx
function getVipPrice(basePrice, stadiumName = '') {
  const n = stadiumName.toLowerCase();
  let multiplier = 1.7;
  if (n.includes('mercedes-benz'))                              multiplier = 4.5;
  else if (n.includes('sofi'))                                  multiplier = 4.5;
  else if (n.includes('gillette') || n.includes('at&t') ||
           n.includes('nrg')     || n.includes('arrowhead') ||
           n.includes('metlife') || n.includes('lincoln') ||
           n.includes('hard rock'))                             multiplier = 4.0;
  else if (n.includes('levi'))                                  multiplier = 4.2;
  else if (n.includes('akron')  || n.includes('azteca') ||
           n.includes('bbva')   || n.includes('bc place'))      multiplier = 3.5;
  else if (n.includes('bmo field') ||
           n.includes('national stadium') ||
           n.includes('air albania'))                           multiplier = 3.0;
  else if (n.includes('loro') || n.includes('partizani') ||
           n.includes('fadil'))                                 multiplier = 2.5;
  else if (n.includes('selman') ||
           n.includes('skënderbeu') || n.includes('skenderbeu') ||
           n.includes('gjirokastër') || n.includes('gjirokaster')) multiplier = 2.0;
  else if (n.includes('mitrovica'))                             multiplier = 1.5;
  else if (n.includes('ferizaj') || n.includes('peja'))         multiplier = 1.3;
  return Math.min(150, Math.round((basePrice * multiplier) * 100) / 100);
}

async function main() {
  const db = await mysql.createConnection(DB);
  console.log('✅ Connected to MySQL\n');

  try {
    // ── 1. Current state ───────────────────────────────────────────────────────
    const [[totalRow]] = await db.query('SELECT COUNT(*) AS total FROM tickets');
    const [[availRow]] = await db.query("SELECT COUNT(*) AS avail FROM tickets WHERE status = 'available'");
    const [[soldRow]]  = await db.query("SELECT COUNT(*) AS sold FROM tickets WHERE status = 'sold'");

    const [vipPrices] = await db.query(`
      SELECT t.price, COUNT(*) AS cnt
      FROM tickets t
      INNER JOIN sections s ON s.id = t.section_id
      WHERE LOWER(s.name) LIKE '%vip%'
      GROUP BY t.price
      ORDER BY cnt DESC
      LIMIT 10
    `);

    console.log('═══════════════════════════════════════════');
    console.log(' CURRENT TICKET COUNTS');
    console.log('═══════════════════════════════════════════');
    console.log(`  Total tickets : ${totalRow.total.toLocaleString()}`);
    console.log(`  Available     : ${availRow.avail.toLocaleString()}`);
    console.log(`  Sold          : ${soldRow.sold.toLocaleString()}`);
    console.log('\n  VIP ticket prices distribution:');
    vipPrices.forEach(r => console.log(`    €${r.price} → ${r.cnt.toLocaleString()} tickets`));
    console.log('');

    // ── 2. Fix VIP prices ──────────────────────────────────────────────────────
    console.log('🔧 Updating VIP ticket prices to correct values...');

    // Get all matches with their stadium names and base prices
    const [matches] = await db.query(`
      SELECT m.id AS match_id, m.base_price, COALESCE(st.name, '') AS stadium_name
      FROM matches m
      LEFT JOIN stadiums st ON st.id = m.stadium_id
    `);

    let totalUpdated = 0;
    for (const m of matches) {
      const correctPrice = getVipPrice(m.base_price, m.stadium_name);
      const [result] = await db.query(`
        UPDATE tickets t
        INNER JOIN sections s ON s.id = t.section_id
        SET t.price = ?, t.updated_at = NOW()
        WHERE t.match_id = ?
          AND LOWER(s.name) LIKE '%vip%'
          AND t.price <> ?
      `, [correctPrice, m.match_id, correctPrice]);
      totalUpdated += result.affectedRows;
    }

    console.log(`  ✅ Updated ${totalUpdated.toLocaleString()} VIP ticket price records\n`);

    // ── 3. Verify new state ────────────────────────────────────────────────────
    const [vipPricesAfter] = await db.query(`
      SELECT t.price, COUNT(*) AS cnt
      FROM tickets t
      INNER JOIN sections s ON s.id = t.section_id
      WHERE LOWER(s.name) LIKE '%vip%'
      GROUP BY t.price
      ORDER BY cnt DESC
      LIMIT 10
    `);

    console.log('═══════════════════════════════════════════');
    console.log(' VIP PRICES AFTER FIX');
    console.log('═══════════════════════════════════════════');
    vipPricesAfter.forEach(r => console.log(`  €${r.price} → ${r.cnt.toLocaleString()} tickets`));

    // ── 4. Show per-section price summary ─────────────────────────────────────
    const [sectionSummary] = await db.query(`
      SELECT s.name AS section_name,
             AVG(t.price) AS avg_price,
             MIN(t.price) AS min_price,
             MAX(t.price) AS max_price,
             COUNT(*) AS cnt,
             SUM(CASE WHEN t.status = 'available' THEN 1 ELSE 0 END) AS available,
             SUM(CASE WHEN t.status = 'sold'      THEN 1 ELSE 0 END) AS sold
      FROM tickets t
      INNER JOIN sections s ON s.id = t.section_id
      GROUP BY s.name
      ORDER BY s.name
      LIMIT 20
    `);

    console.log('\n═══════════════════════════════════════════');
    console.log(' PER-SECTION SUMMARY');
    console.log('═══════════════════════════════════════════');
    sectionSummary.forEach(r => {
      console.log(`  ${r.section_name.padEnd(18)} | price €${r.avg_price.toFixed(2)} | total ${r.cnt.toLocaleString().padStart(6)} | avail ${r.available.toLocaleString().padStart(6)} | sold ${r.sold.toLocaleString().padStart(5)}`);
    });

    // ── 5. Active match availability  ─────────────────────────────────────────
    const [[activeMatches]] = await db.query(`
      SELECT COUNT(*) AS cnt FROM matches WHERE status IN ('scheduled', 'live')
    `);
    const [[activeAvail]] = await db.query(`
      SELECT COUNT(*) AS cnt FROM tickets t
      INNER JOIN matches m ON m.id = t.match_id
      WHERE t.status = 'available' AND m.status IN ('scheduled', 'live')
    `);
    const [[activeSold]] = await db.query(`
      SELECT COALESCE(SUM(oi.quantity), 0) AS cnt
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE o.status IN ('paid', 'confirmed', 'completed')
    `);

    console.log('\n═══════════════════════════════════════════');
    console.log(' ACTIVE MATCH STATS (scheduled / live)');
    console.log('═══════════════════════════════════════════');
    console.log(`  Active matches            : ${activeMatches.cnt}`);
    console.log(`  Available tickets (DB)    : ${activeAvail.cnt.toLocaleString()}`);
    console.log(`  Tickets sold via orders   : ${activeSold.cnt.toLocaleString()}`);
    console.log(`  Real available (DB−sold)  : ${(activeAvail.cnt - activeSold.cnt).toLocaleString()}`);
    console.log('');
    console.log('Done! ✅');

  } finally {
    await db.end();
  }
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
