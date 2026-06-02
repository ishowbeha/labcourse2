class MatchRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // Get all matches with optional filters
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
        whereClause += ' AND m.competition = ?';
        params.push(filters.competition);
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

      // Only upcoming matches by default
      if (!filters.includePast) {
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
        ORDER BY m.match_date ASC, m.match_time ASC
      `, params);

      return rows;
    } catch (error) {
      throw new Error(`Error fetching matches: ${error.message}`);
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

      return rows[0];
    } catch (error) {
      if (error.message === 'Match not found') {
        throw error;
      }
      throw new Error(`Error fetching match: ${error.message}`);
    }
  }

  // Create new match
  async create(matchData) {
    try {
      const [result] = await this.pool.query(
        `INSERT INTO matches (home_team, away_team, stadium_id, match_date, match_time, competition, round, base_price, status, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 1, 1)`,
        [
          matchData.homeTeam,
          matchData.awayTeam,
          matchData.stadiumId,
          matchData.matchDate,
          matchData.matchTime,
          matchData.competition || 'Friendly',
          matchData.round || 'Group Stage',
          matchData.basePrice
        ]
      );

      return this.findById(result.insertId);
    } catch (error) {
      throw new Error(`Error creating match: ${error.message}`);
    }
  }

  // Update match
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
      if (updateData.status !== undefined) { fields.push('status = ?'); params.push(updateData.status); }
      if (updateData.homeScore !== undefined) { fields.push('home_score = ?'); params.push(updateData.homeScore); }
      if (updateData.awayScore !== undefined) { fields.push('away_score = ?'); params.push(updateData.awayScore); }
      if (updateData.round !== undefined) { fields.push('round = ?'); params.push(updateData.round); }

      if (fields.length === 0) {
        return this.findById(id);
      }

      fields.push('updated_at = NOW()');
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
      return rows;
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
}

module.exports = MatchRepository;