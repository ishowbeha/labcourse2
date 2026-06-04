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
      SELECT 
        o.*,
        m.home_team,
        m.away_team,
        m.match_date,
        m.match_time,
        m.competition,
        s.name as stadium_name,
        GROUP_CONCAT(DISTINCT sec.name ORDER BY sec.name SEPARATOR ', ') as section_names,
        COUNT(DISTINCT oi.id) as items_count,
        COUNT(DISTINCT t.id) as ticket_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN tickets t ON oi.ticket_id = t.id
      LEFT JOIN matches m ON t.match_id = m.id
      LEFT JOIN sections sec ON t.section_id = sec.id
      LEFT JOIN stadiums s ON m.stadium_id = s.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    const [totalRows] = await this.pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
      [userId]
    );

    // Map orders to include match details
    const mappedOrders = orders.map(order => ({
      id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      status: order.status,
      payment_method: order.payment_method,
      created_at: order.created_at,
      updated_at: order.updated_at,
      match_name: order.home_team && order.away_team 
        ? `${order.home_team} vs ${order.away_team}` 
        : null,
      home_team: order.home_team,
      away_team: order.away_team,
      match_date: order.match_date,
      match_time: order.match_time,
      competition: order.competition,
      stadium_name: order.stadium_name,
      section_names: order.section_names,
      items_count: order.items_count,
      ticket_count: order.ticket_count
    }));

    return {
      orders: mappedOrders,
      total: totalRows[0].count,
      page,
      limit,
      totalPages: Math.ceil(totalRows[0].count / limit)
    };
  }
}

module.exports = OrderService;