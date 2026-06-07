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
      await this.repository.addOrderItem(orderId, ticket.id, unitPrice, 1, unitPrice, userId);
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
        ANY_VALUE(m.home_team) as home_team,
        ANY_VALUE(m.away_team) as away_team,
        ANY_VALUE(m.match_date) as match_date,
        ANY_VALUE(m.match_time) as match_time,
        ANY_VALUE(m.competition) as competition,
        ANY_VALUE(s.name) as stadium_name,
        GROUP_CONCAT(DISTINCT sec.name ORDER BY sec.name SEPARATOR ', ') as section_names,
        COUNT(DISTINCT oi.id) as items_count,
        COUNT(DISTINCT t.id) as ticket_count,
        COALESCE(SUM(oi.quantity), 0) as items_quantity_sum
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

    // Parse match info from notes for orders without ticket join data
    const parseMatchFromNotes = (notes) => {
      if (!notes) return null;
      const matchRegex = notes.match(/Match:\s*([^-]+?)(?:\s*-\s*|$)/);
      if (matchRegex && matchRegex[1]) {
        return matchRegex[1].trim();
      }
      return null;
    };

    // Parse section from notes
    const parseSectionFromNotes = (notes) => {
      if (!notes) return null;
      const sectionRegex = notes.match(/-\s*(.+)$/);
      if (sectionRegex && sectionRegex[1] && !sectionRegex[1].startsWith('Coupon')) {
        return sectionRegex[1].trim();
      }
      return null;
    };

    // Map orders to include match details
    const mappedOrders = orders.map(order => {
      // For orders with ticket join (ticket_id is not null), use joined data
      // For simple-purchase orders (ticket_id is null), parse from notes
      let homeTeam = order.home_team;
      let awayTeam = order.away_team;
      let matchName = order.home_team && order.away_team 
        ? `${order.home_team} vs ${order.away_team}` 
        : null;
      let sectionNames = order.section_names;
      let ticketCount = order.ticket_count;
      let matchDate = order.match_date;
      let matchTime = order.match_time;
      let competition = order.competition;
      let stadiumName = order.stadium_name;

      // If no match data from join (simple-purchase), parse from notes
      if (!matchName) {
        const parsedMatch = parseMatchFromNotes(order.notes);
        if (parsedMatch) {
          matchName = parsedMatch;
          const teams = parsedMatch.split(' vs ');
          if (teams.length >= 2) {
            homeTeam = teams[0].trim();
            awayTeam = teams[1].trim();
          }
        }
        const parsedSection = parseSectionFromNotes(order.notes);
        if (parsedSection) {
          sectionNames = parsedSection;
        }
        ticketCount = order.items_quantity_sum || 0;
      }

      return {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        status: order.status,
        payment_method: order.payment_method,
        created_at: order.created_at,
        updated_at: order.updated_at,
        match_name: matchName,
        home_team: homeTeam,
        away_team: awayTeam,
        match_date: matchDate,
        match_time: matchTime,
        competition: competition,
        stadium_name: stadiumName,
        section_names: sectionNames,
        items_count: order.items_count,
        ticket_count: ticketCount,
        notes: order.notes
      };
    });

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