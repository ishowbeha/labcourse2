/**
 * reset-and-generate-tickets.js
 * 
 * 1. Deletes ALL existing tickets for active matches
 * 2. Creates 6 sections per stadium (if missing) — 33 seats each
 * 3. Generates exactly 198 tickets per match (6 sections × 33 seats)
 * 
 * Run: node scripts/reset-and-generate-tickets.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const SECTION_DEFS = [
  { name: 'North Stand',   rows: 3, seatsPerRow: 11, multiplier: 1.0 },
  { name: 'South Stand',   rows: 3, seatsPerRow: 11, multiplier: 1.0 },
  { name: 'East Stand',    rows: 3, seatsPerRow: 11, multiplier: 1.0 },
  { name: 'West Stand',    rows: 3, seatsPerRow: 11, multiplier: 1.0 },
  { name: 'VIP North',     rows: 3, seatsPerRow: 11, multiplier: 2.0 },
  { name: 'VIP South',     rows: 3, seatsPerRow: 11, multiplier: 2.0 },
];

// Total per match: 6 × 33 = 198

async function main() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'stadium_tickets',
    waitForConnections: true,
    connectionLimit: 10,
  });

  console.log('✅ Connected.\n');

  // 1. Get active matches
  const [matches] = await pool.query(
    "SELECT id, stadium_id, base_price FROM matches WHERE status IN ('scheduled', 'live') ORDER BY id"
  );
  console.log(`📊 ${matches.length} active match(es).`);

  if (matches.length === 0) { console.log('No matches.'); await pool.end(); return; }

  // 2. Delete ALL existing tickets for these matches (start fresh)
  const matchIds = matches.map(m => m.id);
  console.log(`\n🗑️  Deleting existing tickets for ${matchIds.length} matches...`);
  const [delResult] = await pool.query(
    `DELETE FROM tickets WHERE match_id IN (${matchIds.map(() => '?').join(',')})`,
    matchIds
  );
  console.log(`   Deleted ${delResult.affectedRows} old tickets.`);

  // 3. Group by stadium
  const stadiumMatchMap = {};
  for (const m of matches) {
    const sid = m.stadium_id;
    if (!stadiumMatchMap[sid]) stadiumMatchMap[sid] = [];
    stadiumMatchMap[sid].push(m);
  }
  console.log(`🏟️  ${Object.keys(stadiumMatchMap).length} stadium(s).\n`);

  let totalInserted = 0;

  for (const [stadiumId, stadiumMatches] of Object.entries(stadiumMatchMap)) {
    // Get existing sections — only the 6 we care about
    const [existingSections] = await pool.query(
      'SELECT id, name, row_count, seats_per_row, price_multiplier FROM sections WHERE stadium_id = ?',
      [stadiumId]
    );
    const existingByName = {};
    for (const s of existingSections) existingByName[s.name] = s;

    // Create any missing sections from our defs
    const sectionsToUse = [];
    for (const def of SECTION_DEFS) {
      let section = existingByName[def.name];
      if (!section) {
        const [res] = await pool.query(
          `INSERT INTO sections (stadium_id, name, row_count, seats_per_row, price_multiplier, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [stadiumId, def.name, def.rows, def.seatsPerRow, def.multiplier, `Auto-generated: ${def.name}`]
        );
        section = { id: res.insertId, name: def.name, row_count: def.rows, seats_per_row: def.seatsPerRow, price_multiplier: def.multiplier };
        console.log(`  🆕 Created section "${def.name}" (stadium #${stadiumId})`);
      }
      sectionsToUse.push(section);
    }

    // Generate exactly 198 tickets per match
    for (const match of stadiumMatches) {
      let matchTotal = 0;

      for (const section of sectionsToUse) {
        const totalSeats = 33; // fixed: 3 rows × 11 seats
        const isVip = section.name.toLowerCase().includes('vip');
        const price = isVip
          ? Math.min(150, Math.round(match.base_price * section.price_multiplier * 100) / 100)
          : Math.round(match.base_price * section.price_multiplier * 100) / 100;

        const tickets = [];
        for (let seatIdx = 1; seatIdx <= totalSeats; seatIdx++) {
          const rowNum = Math.ceil(seatIdx / 11);
          const seatNum = ((seatIdx - 1) % 11) + 1;
          tickets.push([match.id, section.id, rowNum, seatNum, price, 'available']);
        }

        // Insert all 33 at once (small batch, safe)
        const placeholders = tickets.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        await pool.query(
          'INSERT INTO tickets (`match_id`, `section_id`, `row_number`, `seat_number`, `price`, `status`) VALUES ' + placeholders,
          tickets.flat()
        );

        matchTotal += tickets.length;
      }

      totalInserted += matchTotal;
      console.log(`  ⚽ Match #${match.id} → ${matchTotal} tickets`);
    }
  }

  console.log('\n═══════════════════════════════════');
  console.log(`  ✅ DONE!`);
  console.log(`     Matches : ${matches.length}`);
  console.log(`     Tickets : ${totalInserted}`);
  console.log(`     Expect  : ${matches.length * 198}`);
  console.log('═══════════════════════════════════');

  await pool.end();
  process.exit(0);
}

main().catch(err => { console.error('❌', err); process.exit(1); });