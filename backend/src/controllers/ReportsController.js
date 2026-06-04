class ReportsController {
  constructor(pool) {
    this.pool = pool;
  }

  // GET /api/reports/activity-logs - User activity from MySQL audit_logs
  async getActivityLogs(req, res) {
    try {
      const { page = 1, limit = 50, action } = req.query;
      const whereParams = [];
      const countParams = [];

      // Count query
      let countQuery = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
      if (action) {
        countQuery += ' AND action = ?';
        countParams.push(action);
      }
      const [countResult] = await this.pool.query(countQuery, countParams);
      const total = countResult[0].count;

      // Data query with user join
      let dataSql = `SELECT audit_logs.*, users.first_name, users.last_name, users.email 
                     FROM audit_logs 
                     LEFT JOIN users ON audit_logs.user_id = users.id 
                     WHERE 1=1`;
      if (action) {
        dataSql += ' AND audit_logs.action = ?';
        whereParams.push(action);
      }
      dataSql += ' ORDER BY audit_logs.created_at DESC LIMIT ? OFFSET ?';
      whereParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const [rows] = await this.pool.query(dataSql, whereParams);

      const logs = rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : 'Unknown',
        userEmail: row.email || null,
        action: row.action,
        entity: row.entity,
        entityId: row.entity_id,
        description: row.action === 'register' ? 'User registered' :
                    row.action === 'login' ? 'User logged in' :
                    row.action === 'purchase' ? 'Bought ticket' :
                    row.action === 'update_profile' ? 'Updated profile' :
                    row.action === 'activity' ? 'General activity' : `${row.action} on ${row.entity}`,
        details: row.new_value ? (() => { try { return JSON.parse(row.new_value); } catch(e) { return row.new_value; } })() : null,
        createdAt: row.created_at
      }));

      res.json({ success: true, data: { logs, total } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = ReportsController;