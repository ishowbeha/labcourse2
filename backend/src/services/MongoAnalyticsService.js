const Analytics = require('../../models/mongodb/Analytics');

class MongoAnalyticsService {
  /**
   * Track a page view event
   */
  async trackPageView(page, userId = null, sessionId = null, metadata = {}, req = null) {
    return this._trackEvent('page_view', 1, {
      page,
      ...metadata,
    }, { sessionId, userId, ipAddress: req?.ip, metadata });
  }

  /**
   * Track a ticket sale
   */
  async trackTicketSale(matchId, matchName, quantity, totalPrice, userId, sessionId = null) {
    return this._trackEvent('ticket_sale', quantity, {
      matchId: String(matchId),
      matchName,
      totalPrice,
    }, { userId, sessionId });
  }

  /**
   * Track revenue
   */
  async trackRevenue(amount, source, userId = null, sessionId = null) {
    return this._trackEvent('revenue', amount, {
      source,
    }, { userId, sessionId });
  }

  /**
   * Track a user registration
   */
  async trackUserRegistration(userId) {
    return this._trackEvent('user_registration', 1, {}, { userId });
  }

  /**
   * Track a match view
   */
  async trackMatchView(matchId, matchName, userId = null, sessionId = null) {
    return this._trackEvent('match_view', 1, {
      matchId: String(matchId),
      matchName,
    }, { userId, sessionId });
  }

  /**
   * Track a search event
   */
  async trackSearch(query, resultsCount, userId = null, sessionId = null) {
    return this._trackEvent('search', 1, {
      query,
      resultsCount,
    }, { userId, sessionId });
  }

  /**
   * Get analytics aggregated by metric type for a given period
   */
  async getAnalytics(days = 30, metricTypes = null) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const match = { timestamp: { $gte: since } };
      if (metricTypes && metricTypes.length > 0) {
        match.metricType = { $in: metricTypes };
      }

      const stats = await Analytics.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$metricType',
            totalValue: { $sum: '$value' },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalValue: -1 } },
      ]);

      return stats.map((s) => ({
        metricType: s._id,
        totalValue: s.totalValue,
        count: s.count,
      }));
    } catch (error) {
      console.error('[MongoAnalyticsService] Failed to get analytics:', error.message);
      return [];
    }
  }

  /**
   * Get page view analytics (most viewed pages)
   */
  async getPageViews(days = 30, limit = 10) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const stats = await Analytics.aggregate([
        { $match: { metricType: 'page_view', timestamp: { $gte: since } } },
        {
          $group: {
            _id: '$dimensions.page',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);

      return stats.map((s) => ({ page: s._id, views: s.count }));
    } catch (error) {
      console.error('[MongoAnalyticsService] Failed to get page views:', error.message);
      return [];
    }
  }

  /**
   * Get ticket sales analytics over time
   */
  async getTicketSalesAnalytics(days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const stats = await Analytics.aggregate([
        { $match: { metricType: 'ticket_sale', timestamp: { $gte: since } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            },
            tickets: { $sum: '$value' },
            revenue: { $sum: '$dimensions.totalPrice' },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]);

      return stats.map((s) => ({
        date: s._id.date,
        tickets: s.tickets,
        revenue: s.revenue,
      }));
    } catch (error) {
      console.error('[MongoAnalyticsService] Failed to get ticket sales analytics:', error.message);
      return [];
    }
  }

  /**
   * Internal: track an analytics event
   */
  async _trackEvent(metricType, value, dimensions = {}, extras = {}) {
    try {
      const entry = new Analytics({
        metricType,
        value,
        dimensions,
        metadata: extras.metadata || {},
        sessionId: extras.sessionId || null,
        userId: extras.userId ? String(extras.userId) : null,
        ipAddress: extras.ipAddress || null,
      });
      await entry.save();
      return entry;
    } catch (error) {
      console.error(`[MongoAnalyticsService] Failed to track ${metricType}:`, error.message);
      return null;
    }
  }
}

module.exports = MongoAnalyticsService;