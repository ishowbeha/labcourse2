const OrderRepository = require('../repositories/OrderRepository');

class OrderService {
  constructor(pool) {
    this.pool = pool;
    this.repository = new OrderRepository(pool);
  }

  async purchaseTickets(userId, purchaseData) {
    const { matchId, sectionName, quantity, paymentMethod, customerEmail, notes } = purchaseData;

    // Validate match exists
    const [matches] = await this.pool.query(
      'SELECT id, home_team, away_team, base_price, status FROM matches WHERE id = ?',
      [matchId]
    );
    if (matches.length === 0) {
      throw new Error('Match not found');
    }
    const match = matches[0];

    // Get or create section and generate tickets if needed
    const sectionId = await this.repository.getOrCreateSectionId(matchId, sectionName);
    if (!sectionId) {
      throw new Error('Could not resolve section for this match');
    }

    // Get available tickets
    const availableTickets = await this.repository.getAvailableTicketsForMatch(matchId, sectionId, quantity);
    if (availableTickets.length < quantity) {
      throw new Error(`Only ${availableTickets.length} tickets available for this section`);
    }

    // Calculate pricing
    const unitPrice = availableTickets[0].price || match.base_price;
    const subtotal = unitPrice * quantity;
    const fees = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = subtotal + fees;

    // Generate unique order number
    const orderNumber = await this.repository.generateOrderNumber();

    // Create the order
    const orderId = await this.repository.createOrder({
      userId,
      orderNumber,
      totalAmount,
      status: 'paid',
      paymentMethod: paymentMethod || 'credit-card',
      customerEmail: customerEmail || '',
      notes: notes || null,
      createdBy: userId
    });

    // Mark tickets as sold and add order items
    for (let i = 0; i < quantity && i < availableTickets.length; i++) {
      const ticket = availableTickets[i];
      await this.repository.markTicketSold(ticket.id, userId);
      await this.repository.addOrderItem(orderId, ticket.id, unitPrice, 1, unitPrice);
    }

    // Return the order summary
    return {
      orderId,
      orderNumber,
      match: `${match.home_team} vs ${match.away_team}`,
      sectionName,
      quantity,
      unitPrice,
      subtotal,
      fees,
      totalAmount,
      status: 'paid',
      tickets: availableTickets.slice(0, quantity).map(t => ({
        ticketId: t.id,
        row: t.row_number,
        seat: t.seat_number,
        price: t.price
      }))
    };
  }

  async getUserOrders(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [orders] = await this.pool.query(`
      SELECT o.*,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    const [totalRows] = await this.pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
      [userId]
    );

    return {
      orders,
      total: totalRows[0].count,
      page,
      limit,
      totalPages: Math.ceil(totalRows[0].count / limit)
    };
  }
}

module.exports = OrderService;