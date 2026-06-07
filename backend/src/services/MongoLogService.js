const ActivityLog = require('../../models/mongodb/ActivityLog');

class MongoLogService {
  /**
   * Log a user activity to MongoDB
   */
  async logActivity(userId, action, resourceType, resourceId, description, metadata = {}, req = null) {
    try {
      const log = new ActivityLog({
        userId: userId ? String(userId) : null,
        action,
        resourceType,
        resourceId: String(resourceId || ''),
        description,
        metadata,
        ipAddress: req?.ip || req?.ipAddress || null,
        userAgent: req?.headers?.['user-agent'] || null,
      });
      const saved = await log.save();
      return saved;
    } catch (error) {
      console.error('[MongoLogService] Failed to log activity:', error.message);
      return null;
    }
  }

  /**
   * Get recent activity logs with pagination
   */
  async getRecentActivities(limit = 50, skip = 0, filters = {}) {
    try {
      const query = {};
      if (filters.action) query.action = filters.action;
      if (filters.resourceType) query.resourceType = filters.resourceType;
      if (filters.userId) query.userId = filters.userId;

      const [logs, total] = await Promise.all([
        ActivityLog.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ActivityLog.countDocuments(query),
      ]);

      return { logs, total };
    } catch (error) {
      console.error('[MongoLogService] Failed to get activities:', error.message);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get activity statistics grouped by action type
   */
  async getActivityStats(days = 7) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const stats = await ActivityLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const total = stats.reduce((sum, s) => sum + s.count, 0);

      return {
        total,
        since,
        actions: stats.map((s) => ({ action: s._id, count: s.count })),
      };
    } catch (error) {
      console.error('[MongoLogService] Failed to get activity stats:', error.message);
      return { total: 0, actions: [] };
    }
  }
}

module.exports = MongoLogService;