class OrderRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async createOrder(orderData) {
    const {
      userId, orderNumber, totalAmount, status,
      paymentMethod, customerEmail, notes, createdBy
    } = orderData;

    const [result] = await this.pool.query(
      `INSERT INTO orders (user_id, order_number, total_amount, status, payment_method, payment_status, customer_email, notes, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, NOW(), NOW())`,
      [userId, orderNumber, totalAmount, status || 'paid', paymentMethod || 'credit-card', customerEmail, notes || null, createdBy || userId, createdBy || userId]
    );

    return result.insertId;
  }

  async addOrderItem(orderId, ticketId, unitPrice, quantity, subtotal, createdBy = null) {
    const [result] = await this.pool.query(
      `INSERT INTO order_items (order_id, ticket_id, unit_price, quantity, subtotal, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [orderId, ticketId, unitPrice, quantity, subtotal, createdBy, createdBy]
    );
    return result.insertId;
  }

  async markTicketSold(ticketId, purchaserId) {
    await this.pool.query(
      `UPDATE tickets SET status = 'sold', purchaser_id = ?, purchased_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [purchaserId, ticketId]
    );
  }

  async getAvailableTicketsForMatch(matchId, sectionId, limit = 10) {
    const [tickets] = await this.pool.query(
      `SELECT id, row_number, seat_number, price
       FROM tickets
       WHERE match_id = ? AND section_id = ? AND status = 'available'
       ORDER BY row_number, seat_number
       LIMIT ?`,
      [matchId, sectionId, parseInt(limit)]
    );
    return tickets;
  }

  async getOrCreateSectionId(matchId, sectionName) {
    // Get the stadium_id from the match
    const [matchRows] = await this.pool.query(
      'SELECT stadium_id, base_price FROM matches WHERE id = ?',
      [matchId]
    );
    if (matchRows.length === 0) return null;

    const stadiumId = matchRows[0].stadium_id;
    const basePrice = matchRows[0].base_price;

    // Try to find existing section by name
    const [existing] = await this.pool.query(
      'SELECT id FROM sections WHERE stadium_id = ? AND name = ?',
      [stadiumId, sectionName]
    );
    if (existing.length > 0) {
      return existing[0].id;
    }

    // Create the section if it doesn't exist
    const [result] = await this.pool.query(
      `INSERT INTO sections (stadium_id, name, row_count, seats_per_row, price_multiplier, description, created_at, updated_at)
       VALUES (?, ?, 10, 30, 1.0, ?, NOW(), NOW())`,
      [stadiumId, sectionName, sectionName]
    );

    // Also generate tickets for this section if they don't exist
    const sectionId = result.insertId;
    await this.generateTicketsForSection(matchId, sectionId, basePrice);

    return sectionId;
  }

  async generateTicketsForSection(matchId, sectionId, basePrice) {
    // Check if tickets already exist for this match + section
    const [existing] = await this.pool.query(
      'SELECT COUNT(*) as count FROM tickets WHERE match_id = ? AND section_id = ?',
      [matchId, sectionId]
    );
    if (existing[0].count > 0) return;

    // Generate tickets (10 rows x 30 seats = 300 tickets per section as default)
    const tickets = [];
    for (let row = 1; row <= 10; row++) {
      for (let seat = 1; seat <= 30; seat++) {
        tickets.push([matchId, sectionId, row, seat, basePrice, 'available']);
      }
    }

    // Batch insert
    const placeholders = tickets.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values = tickets.flat();
    await this.pool.query(
      `INSERT INTO tickets (match_id, section_id, row_number, seat_number, price, status)
       VALUES ${placeholders}`,
      values
    );
  }

  async generateOrderNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 900000) + 100000;
    const orderNumber = `ORD-${year}${month}${day}-${random}`;

    // Ensure uniqueness
    const [existing] = await this.pool.query(
      'SELECT id FROM orders WHERE order_number = ?',
      [orderNumber]
    );
    if (existing.length > 0) {
      return this.generateOrderNumber();
    }
    return orderNumber;
  }
}

module.exports = OrderRepository;