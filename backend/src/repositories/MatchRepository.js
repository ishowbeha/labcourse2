class MatchRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // Map database snake_case to camelCase for frontend
  _mapMatch(match) {
    if (!match) return null;
    return {
      id: match.id,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      stadiumId: match.stadium_id,
      matchDate: match.match_date,
      matchTime: match.match_time,
      competition: match.competition,
      round: match.round,
      status: match.status,
      homeScore: match.home_score,
      awayScore: match.away_score,
      basePrice: match.base_price,
      maxTicketsPerUser: match.max_tickets_per_user,
      saleStartDate: match.sale_start_date,
      saleEndDate: match.sale_end_date,
      createdBy: match.created_by,
      updatedBy: match.updated_by,
      createdAt: match.created_at,
      updatedAt: match.updated_at,
      stadiumName: match.stadium_name,
      stadiumCity: match.stadium_city,
      stadiumCapacity: match.stadium_capacity
    };
  }

  // Get all matches with optional filters and pagination
  async findAll(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      // Filter by status
      if (filters.status) {
        whereClause += ' AND m.status = ?';
        params.push(filters.status);
      }

      // Filter by competition
      if (filters.competition) {
        whereClause += ' AND m.competition LIKE ?';
        params.push(`%${filters.competition}%`);
      }

      // Filter by date range
      if (filters.startDate) {
        whereClause += ' AND m.match_date >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereClause += ' AND m.match_date <= ?';
        params.push(filters.endDate);
      }

      // Filter by team (home or away)
      if (filters.team) {
        whereClause += ' AND (m.home_team LIKE ? OR m.away_team LIKE ?)';
        const searchParam = `%${filters.team}%`;
        params.push(searchParam, searchParam);
      }

      // Filter by stadium name
      if (filters.stadium) {
        whereClause += ' AND s.name LIKE ?';
        params.push(`%${filters.stadium}%`);
      }

      // Generic search across team, competition, stadium
      if (filters.search) {
        whereClause += ' AND (m.home_team LIKE ? OR m.away_team LIKE ? OR m.competition LIKE ? OR s.name LIKE ?)';
        const searchParam = `%${filters.search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }

      // Only upcoming matches by default
      if (!filters.includePast && !filters.adminMode) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

        whereClause += ' AND (m.match_date > ? OR (m.match_date = ? AND m.match_time >= ?))';
        params.push(today, today, currentTime);
      }

      const [rows] = await this.pool.query(`
        SELECT 
          m.*,
          s.name as stadium_name,
          s.city as stadium_city,
          s.capacity as stadium_capacity
        FROM matches m
        LEFT JOIN stadiums s ON m.stadium_id = s.id
        ${whereClause}
        ORDER BY m.match_date DESC, m.match_time DESC
      `, params);

      return rows.map(match => this._mapMatch(match));
    } catch (error) {
      throw new Error(`Error fetching matches: ${error.message}`);
    }
  }

  // Get paginated matches for admin with counts
  async findAllAdmin(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      // Filter by status
      if (filters.status) {
        whereClause += ' AND m.status = ?';
        params.push(filters.status);
      }

      // Filter by competition
      if (filters.competition) {
        whereClause += ' AND m.competition LIKE ?';
        params.push(`%${filters.competition}%`);
      }

      // Filter by team (home or away)
      if (filters.team) {
        whereClause += ' AND (m.home_team LIKE ? OR m.away_team LIKE ?)';
        const searchParam = `%${filters.team}%`;
        params.push(searchParam, searchParam);
      }

      // Filter by stadium name
      if (filters.stadium) {
        whereClause += ' AND s.name LIKE ?';
        params.push(`%${filters.stadium}%`);
      }

      // Generic search
      if (filters.search) {
        whereClause += ' AND (m.home_team LIKE ? OR m.away_team LIKE ? OR m.competition LIKE ? OR s.name LIKE ? OR m.match_date LIKE ?)';
        const searchParam = `%${filters.search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
      }

      // Date range
      if (filters.dateFrom) {
        whereClause += ' AND m.match_date >= ?';
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        whereClause += ' AND m.match_date <= ?';
        params.push(filters.dateTo);
      }

      // Get total count
      const [countRows] = await this.pool.query(`
        SELECT COUNT(*) as total
        FROM matches m
        LEFT JOIN stadiums s ON m.stadium_id = s.id
        ${whereClause}
      `, params);
      const total = countRows[0].total;

      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      const [rows] = await this.pool.query(`
        SELECT 
          m.*,
          s.name as stadium_name,
          s.city as stadium_city,
          s.capacity as stadium_capacity,
          (SELECT COUNT(*) FROM tickets t WHERE t.match_id = m.id) as total_tickets,
          (SELECT COUNT(*) FROM tickets t WHERE t.match_id = m.id AND t.status = 'available') as available_tickets,
          (SELECT COUNT(*) FROM tickets t WHERE t.match_id = m.id AND t.status = 'sold') as sold_tickets,
          (SELECT COUNT(*) FROM tickets t WHERE t.match_id = m.id AND t.status = 'reserved') as reserved_tickets,
          (SELECT COALESCE(SUM(t.price), 0) FROM tickets t WHERE t.match_id = m.id AND t.status = 'sold') as revenue
        FROM matches m
        LEFT JOIN stadiums s ON m.stadium_id = s.id
        ${whereClause}
        ORDER BY m.match_date DESC, m.match_time DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), parseInt(offset)]);

      return {
        matches: rows.map(match => ({
          ...this._mapMatch(match),
          totalTickets: match.total_tickets,
          availableTickets: match.available_tickets,
          soldTickets: match.sold_tickets,
          reservedTickets: match.reserved_tickets,
          revenue: match.revenue
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error fetching admin matches: ${error.message}`);
    }
  }

  // Get match by ID
  async findById(id) {
    try {
      const [rows] = await this.pool.query(`
        SELECT 
          m.*,
          s.name as stadium_name,
          s.city as stadium_city,
          s.capacity as stadium_capacity
        FROM matches m
        LEFT JOIN stadiums s ON m.stadium_id = s.id
        WHERE m.id = ?
      `, [id]);

      if (rows.length === 0) {
        throw new Error('Match not found');
      }

      return this._mapMatch(rows[0]);
    } catch (error) {
      if (error.message === 'Match not found') {
        throw error;
      }
      throw new Error(`Error fetching match: ${error.message}`);
    }
  }

  // Create new match - includes all fields
  async create(matchData) {
    try {
      const [result] = await this.pool.query(
        `INSERT INTO matches 
         (home_team, away_team, stadium_id, match_date, match_time, competition, round, 
          base_price, max_tickets_per_user, sale_start_date, sale_end_date, status, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          matchData.homeTeam,
          matchData.awayTeam,
          matchData.stadiumId,
          matchData.matchDate,
          matchData.matchTime,
          matchData.competition || 'Friendly',
          matchData.round || 'Group Stage',
          matchData.basePrice || 0,
          matchData.maxTicketsPerUser || 4,
          matchData.saleStartDate || null,
          matchData.saleEndDate || null,
          matchData.status || 'scheduled',
          matchData.createdBy || 1,
          matchData.updatedBy || 1
        ]
      );

      return this.findById(result.insertId);
    } catch (error) {
      throw new Error(`Error creating match: ${error.message}`);
    }
  }

  // Update match - includes all fields
  async update(id, updateData) {
    try {
      const fields = [];
      const params = [];

      if (updateData.homeTeam !== undefined) { fields.push('home_team = ?'); params.push(updateData.homeTeam); }
      if (updateData.awayTeam !== undefined) { fields.push('away_team = ?'); params.push(updateData.awayTeam); }
      if (updateData.stadiumId !== undefined) { fields.push('stadium_id = ?'); params.push(updateData.stadiumId); }
      if (updateData.matchDate !== undefined) { fields.push('match_date = ?'); params.push(updateData.matchDate); }
      if (updateData.matchTime !== undefined) { fields.push('match_time = ?'); params.push(updateData.matchTime); }
      if (updateData.competition !== undefined) { fields.push('competition = ?'); params.push(updateData.competition); }
      if (updateData.round !== undefined) { fields.push('round = ?'); params.push(updateData.round); }
      if (updateData.status !== undefined) { fields.push('status = ?'); params.push(updateData.status); }
      if (updateData.homeScore !== undefined) { fields.push('home_score = ?'); params.push(updateData.homeScore); }
      if (updateData.awayScore !== undefined) { fields.push('away_score = ?'); params.push(updateData.awayScore); }
      if (updateData.basePrice !== undefined) { fields.push('base_price = ?'); params.push(updateData.basePrice); }
      if (updateData.maxTicketsPerUser !== undefined) { fields.push('max_tickets_per_user = ?'); params.push(updateData.maxTicketsPerUser); }
      if (updateData.saleStartDate !== undefined) { fields.push('sale_start_date = ?'); params.push(updateData.saleStartDate); }
      if (updateData.saleEndDate !== undefined) { fields.push('sale_end_date = ?'); params.push(updateData.saleEndDate); }

      if (fields.length === 0) {
        return this.findById(id);
      }

      fields.push('updated_at = NOW()');
      if (updateData.updatedBy) {
        fields.push('updated_by = ?');
        params.push(updateData.updatedBy);
      }
      params.push(id);

      await this.pool.query(`UPDATE matches SET ${fields.join(', ')} WHERE id = ?`, params);
      return this.findById(id);
    } catch (error) {
      throw new Error(`Error updating match: ${error.message}`);
    }
  }

  // Delete match
  async delete(id) {
    try {
      await this.findById(id);
      await this.pool.query('DELETE FROM matches WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw new Error(`Error deleting match: ${error.message}`);
    }
  }

  // Get matches by stadium
  async findByStadium(stadiumId) {
    try {
      const [rows] = await this.pool.query(`
        SELECT 
          m.*,
          s.name as stadium_name,
          s.city as stadium_city,
          s.capacity as stadium_capacity
        FROM matches m
        LEFT JOIN stadiums s ON m.stadium_id = s.id
        WHERE m.stadium_id = ?
        ORDER BY m.match_date ASC, m.match_time ASC
      `, [stadiumId]);
      return rows.map(match => this._mapMatch(match));
    } catch (error) {
      throw new Error(`Error fetching matches by stadium: ${error.message}`);
    }
  }

  // Get available tickets count for a match
  async getAvailableTicketsCount(matchId) {
    try {
      const [rows] = await this.pool.query(
        "SELECT COUNT(*) as count FROM tickets WHERE match_id = ? AND status = 'available'",
        [matchId]
      );
      return rows[0].count;
    } catch (error) {
      throw new Error(`Error fetching available tickets: ${error.message}`);
    }
  }

  // Get all competitions for filter dropdown
  async getAllCompetitions() {
    try {
      const [rows] = await this.pool.query(
        'SELECT DISTINCT competition FROM matches WHERE competition IS NOT NULL AND competition != "" ORDER BY competition ASC'
      );
      return rows.map(r => r.competition);
    } catch (error) {
      throw new Error(`Error fetching competitions: ${error.message}`);
    }
  }
}

module.exports = MatchRepository;