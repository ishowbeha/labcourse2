const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;

const SECTIONS_TO_ENSURE = [
  { name: 'VIP North', capacity: 500, row_count: 2, seats_per_row: 10, price_multiplier: 3.0, description: 'VIP North Seating' },
  { name: 'VIP South', capacity: 500, row_count: 2, seats_per_row: 10, price_multiplier: 3.0, description: 'VIP South Seating' },
  { name: 'East Stand', capacity: 2000, row_count: 5, seats_per_row: 10, price_multiplier: 1.5, description: 'East Stand Seating' },
  { name: 'West Stand', capacity: 2000, row_count: 5, seats_per_row: 10, price_multiplier: 1.5, description: 'West Stand Seating' },
  { name: 'North Stand', capacity: 3000, row_count: 5, seats_per_row: 10, price_multiplier: 1.0, description: 'North Stand Seating' },
  { name: 'South Stand', capacity: 3000, row_count: 5, seats_per_row: 10, price_multiplier: 1.0, description: 'South Stand Seating' },
];

function parseNotes(notes) {
  if (!notes) return null;
  let matchName = '';
  let sectionName = '';

  // Try to find Match and Section if separated by |
  if (notes.includes('|')) {
    const parts = notes.split('|').map(p => p.trim());
    for (const part of parts) {
      if (part.toLowerCase().startsWith('match:')) {
        matchName = part.substring(6).trim();
      } else if (part.toLowerCase().startsWith('section:')) {
        sectionName = part.substring(8).trim();
      }
    }
  }

  // If we didn't find matchName, search for it with regex
  if (!matchName) {
    const matchMatch = notes.match(/Match:\s*([^|]+)/i); // Match anything up to the next pipe
    if (matchMatch) {
      matchName = matchMatch[1].trim();
    }
  }

  // Handle case where matchName contains the section name after a hyphen, e.g. "Germany vs Japan - North Stand"
  if (matchName) {
    if (matchName.includes(' - ')) {
      const parts = matchName.split(' - ');
      matchName = parts[0].trim();
      if (!sectionName) sectionName = parts[1].trim();
    } else if (matchName.includes('-')) {
      const lastDash = matchName.lastIndexOf('-');
      if (lastDash !== -1 && lastDash > matchName.toLowerCase().indexOf('vs')) {
        const afterDash = matchName.substring(lastDash + 1).trim();
        // Make sure it looks like a section (not part of team names like Guinea-Bissau)
        if (['stand', 'lounge', 'suite', 'vip', 'bowl', 'level', 'pass'].some(k => afterDash.toLowerCase().includes(k))) {
          if (!sectionName) sectionName = afterDash;
          matchName = matchName.substring(0, lastDash).trim();
        }
      }
    }
  }

  if (!sectionName && matchName) {
    const matchStr = 'Match: ' + matchName;
    const index = notes.indexOf(matchStr);
    if (index !== -1) {
      const rest = notes.substring(index + matchStr.length).trim();
      if (rest.startsWith('-')) {
        sectionName = rest.substring(1).trim().split('|')[0].trim();
      }
    }
  }

  if (!matchName) return null;

  // Clean match name
  matchName = matchName.trim();
  const teams = matchName.split(/\s+vs\s+/i);
  if (teams.length < 2) return null;
  const home = teams[0].trim();
  const away = teams[1].trim();

  // Clean section name
  if (sectionName) {
    sectionName = sectionName.trim();
  } else {
    sectionName = 'South Stand';
  }

  // Map special section names to standard ones
  if (sectionName.toLowerCase().includes('vip')) {
    if (sectionName.toLowerCase().includes('south')) {
      sectionName = 'VIP South';
    } else {
      sectionName = 'VIP North';
    }
  }

  if (sectionName.toLowerCase().includes('all sections')) {
    sectionName = 'VIP North'; // Fallback for season pass
  }

  return { home, away, sectionName };
}

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

    console.log('Connected to database.');

    // 1. Ensure all stadiums have the 6 sections
    console.log('Ensuring all stadiums have the 6 required sections...');
    const [stadiums] = await conn.execute('SELECT id, name FROM stadiums');
    for (const stadium of stadiums) {
      for (const sect of SECTIONS_TO_ENSURE) {
        const [existing] = await conn.execute(
          'SELECT id FROM sections WHERE stadium_id = ? AND name = ?',
          [stadium.id, sect.name]
        );
        if (existing.length === 0) {
          await conn.execute(
            `INSERT INTO sections (stadium_id, name, row_count, seats_per_row, price_multiplier, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [stadium.id, sect.name, sect.row_count, sect.seats_per_row, sect.price_multiplier, sect.description]
          );
        }
      }
    }
    console.log('Sections ensured successfully.');

    // 2. Clear out any existing tickets to start clean
    console.log('Clearing existing tickets table to regenerate fresh...');
    await conn.execute('DELETE FROM tickets');
    console.log('Tickets cleared.');

    // 3. Generate tickets for all matches and the 6 sections
    console.log('Generating tickets for all matches and sections...');
    const [matches] = await conn.execute('SELECT id, home_team, away_team, base_price, stadium_id FROM matches');

    for (const match of matches) {
      // Get the 6 sections for this stadium
      const [sections] = await conn.execute(
        'SELECT id, name, row_count, seats_per_row, price_multiplier FROM sections WHERE stadium_id = ? AND name IN (?, ?, ?, ?, ?, ?)',
        [match.stadium_id, 'VIP North', 'VIP South', 'East Stand', 'West Stand', 'North Stand', 'South Stand']
      );

      for (const section of sections) {
        const totalSeats = section.row_count * section.seats_per_row;
        const ticketPrice = Math.round((match.base_price * section.price_multiplier) * 100) / 100;

        const tickets = [];
        for (let seatIdx = 1; seatIdx <= totalSeats; seatIdx++) {
          const rowNumber = Math.ceil(seatIdx / section.seats_per_row);
          const seatNumber = ((seatIdx - 1) % section.seats_per_row) + 1;
          tickets.push([match.id, section.id, rowNumber, seatNumber, ticketPrice, 'available']);
        }

        // Bulk insert in chunks of 500 to prevent packet size errors
        const chunkSize = 500;
        for (let i = 0; i < tickets.length; i += chunkSize) {
          const chunk = tickets.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
          const values = chunk.flat();
          await conn.query(
            `INSERT INTO tickets (\`match_id\`, \`section_id\`, \`row_number\`, \`seat_number\`, \`price\`, \`status\`)
             VALUES ${placeholders}`,
            values
          );
        }
      }
    }
    console.log('All match seats generated successfully.');

    // 4. Map existing orders to the newly generated tickets
    console.log('Processing and mapping existing orders...');
    const [orders] = await conn.query(`
      SELECT o.id, o.user_id, o.notes, o.created_at, o.status
      FROM orders o
      WHERE o.status IN ('paid', 'confirmed', 'completed')
    `);

    for (const order of orders) {
      const parsed = parseNotes(order.notes);
      if (!parsed) {
        console.log(`Skipping order #${order.id} (could not parse notes: "${order.notes}")`);
        continue;
      }

      const { home, away, sectionName } = parsed;

      // Find the match
      const [matchRows] = await conn.query(
        `SELECT id FROM matches 
         WHERE (home_team LIKE ? AND away_team LIKE ?)
            OR (away_team LIKE ? AND home_team LIKE ?)`,
        [`%${home}%`, `%${away}%`, `%${home}%`, `%${away}%`]
      );

      if (matchRows.length === 0) {
        console.log(`Could not find match for order #${order.id} ("${home} vs ${away}")`);
        continue;
      }

      const matchId = matchRows[0].id;

      // Find the section
      const [sectionRows] = await conn.query(
        `SELECT s.id FROM sections s
         JOIN matches m ON m.stadium_id = s.stadium_id
         WHERE m.id = ? AND s.name = ?`,
        [matchId, sectionName]
      );

      if (sectionRows.length === 0) {
        console.log(`Could not find section "${sectionName}" for match ID ${matchId} (order #${order.id})`);
        continue;
      }

      const sectionId = sectionRows[0].id;

      // Get order items for this order
      const [items] = await conn.query(
        'SELECT id, quantity FROM order_items WHERE order_id = ? AND ticket_id IS NULL',
        [order.id]
      );

      if (items.length === 0) {
        console.log(`No unlinked order items for order #${order.id}`);
        continue;
      }

      for (const item of items) {
        const quantity = item.quantity;

        // Fetch available tickets
        const [availTickets] = await conn.query(
          `SELECT id FROM tickets 
           WHERE match_id = ? AND section_id = ? AND status = 'available'
           LIMIT ?`,
          [matchId, sectionId, quantity]
        );

        if (availTickets.length < quantity) {
          console.log(`Not enough available tickets for order #${order.id} match ID ${matchId} section ID ${sectionId}. Needed ${quantity}, found ${availTickets.length}`);
          continue;
        }

        // Link and mark sold
        for (let idx = 0; idx < quantity; idx++) {
          const ticketId = availTickets[idx].id;
          // Mark ticket sold
          await conn.query(
            `UPDATE tickets 
             SET status = 'sold', purchaser_id = ?, purchased_at = ?
             WHERE id = ?`,
            [order.user_id, order.created_at, ticketId]
          );

          if (idx === 0) {
            // Update this order item to point to the first ticket
            await conn.query(
              'UPDATE order_items SET ticket_id = ? WHERE id = ?',
              [ticketId, item.id]
            );
          } else {
            // For quantity > 1, insert additional order items so each sold ticket has an order item entry
            // This is clean and matches the schema constraint where order_items link to tickets
            const [itemDetail] = await conn.query(
              'SELECT unit_price, created_by, updated_by FROM order_items WHERE id = ?',
              [item.id]
            );
            const detail = itemDetail[0];
            await conn.query(
              `INSERT INTO order_items (order_id, ticket_id, quantity, unit_price, subtotal, created_by, updated_by, created_at, updated_at)
               VALUES (?, ?, 1, ?, ?, ?, ?, NOW(), NOW())`,
              [order.id, ticketId, detail.unit_price, detail.unit_price, detail.created_by, detail.updated_by]
            );
          }
        }

        // If we split quantity > 1 into individual items, update the original item quantity to 1
        if (quantity > 1) {
          const [origDetail] = await conn.query(
            'SELECT unit_price FROM order_items WHERE id = ?',
            [item.id]
          );
          const uPrice = origDetail[0].unit_price;
          await conn.query(
            'UPDATE order_items SET quantity = 1, subtotal = ? WHERE id = ?',
            [uPrice, item.id]
          );
        }

        console.log(`Successfully linked order #${order.id} (${quantity} ticket(s)) to match ID ${matchId} section "${sectionName}".`);
      }
    }

    console.log('All mapping completed successfully.');

  } catch(e) {
    console.error('Migration error:', e.message, e.stack);
  } finally {
    if (conn) await conn.end();
  }
}
run();
