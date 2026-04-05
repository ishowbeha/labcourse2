const Match = require('../models/Match');

class MatchRepository {
  constructor(db) {
    this.db = db;
  }

  // Get all matches with optional filters
  findAll(filters = {}) {
    try {
      let query = `
        SELECT m.*, s.name as stadium_name, s.city as stadium_city, s.capacity as stadium_capacity
        FROM matches m
        LEFT JOIN stadiums s ON m.stadium_id = s.id
        WHERE 1=1
      `;
      const params = [];

      // Filter by status
      if (filters.status) {
        query += ' AND m.status = ?';
        params.push(filters.status);
      }

      // Filter by competition
      if (filters.competition) {
        query += ' AND m.competition = ?';
        params.push(filters.competition);
      }

      // Filter by date range
      if (filters.startDate) {
        query += ' AND m.match_date >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND m.match_date <= ?';
        params.push(filters.endDate);
      }

      // Filter by team (home or away)
      if (filters.team) {
        query += ' AND (m.home_team LIKE ? OR m.away_team LIKE ?)';
        const teamPattern = `%${filters.team}%`;
        params.push(teamPattern, teamPattern);
      }

      // Only upcoming matches by default
      if (!filters.includePast) {
        query += " AND (m.match_date > date('now') OR (m.match_date = date('now') AND m.match_time >= time('now')))";
      }

      query += ' ORDER BY m.match_date ASC, m.match_time ASC';

      const stmt = this.db.prepare(query);
      const matches = stmt.all(...params);

      return matches.map(match => new Match(match));
    } catch (error) {
      throw new Error(`Error fetching matches: ${error.message}`);
    }
  }

  // Get match by ID
  findById(id) {
    try {
      const query = `
        SELECT m.*, s.name as stadium_name, s.city as stadium_city, s.capacity as stadium_capacity
        FROM matches m
        LEFT JOIN stadiums s ON m.stadium_id = s.id
        WHERE m.id = ?
      `;
      const match = this.db.prepare(query).get(id);
      
      if (!match) {
        throw new Error('Match not found');
      }
      
      return new Match(match);
    } catch (error) {
      if (error.message === 'Match not found') {
        throw error;
      }
      throw new Error(`Error fetching match: ${error.message}`);
    }
  }

  // Create new match
  create(matchData) {
    try {
      const query = `
        INSERT INTO matches (
          home_team, away_team, stadium_id, match_date, match_time,
          competition, round, base_price, status,
          created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 1, 1)
      `;
      
      const result = this.db.prepare(query).run(
        matchData.homeTeam,
        matchData.awayTeam,
        matchData.stadiumId,
        matchData.matchDate,
        matchData.matchTime,
        matchData.competition || 'Friendly',
        matchData.round || 'Group Stage',
        matchData.basePrice
      );
      
      return this.findById(result.lastInsertRowid);
    } catch (error) {
      throw new Error(`Error creating match: ${error.message}`);
    }
  }

  // Update match
  update(id, updateData) {
    try {
      const fields = [];
      const values = [];

      if (updateData.homeTeam !== undefined) {
        fields.push('home_team = ?');
        values.push(updateData.homeTeam);
      }
      if (updateData.awayTeam !== undefined) {
        fields.push('away_team = ?');
        values.push(updateData.awayTeam);
      }
      if (updateData.stadiumId !== undefined) {
        fields.push('stadium_id = ?');
        values.push(updateData.stadiumId);
      }
      if (updateData.matchDate !== undefined) {
        fields.push('match_date = ?');
        values.push(updateData.matchDate);
      }
      if (updateData.matchTime !== undefined) {
        fields.push('match_time = ?');
        values.push(updateData.matchTime);
      }
      if (updateData.competition !== undefined) {
        fields.push('competition = ?');
        values.push(updateData.competition);
      }
      if (updateData.status !== undefined) {
        fields.push('status = ?');
        values.push(updateData.status);
      }
      if (updateData.homeScore !== undefined) {
        fields.push('home_score = ?');
        values.push(updateData.homeScore);
      }
      if (updateData.awayScore !== undefined) {
        fields.push('away_score = ?');
        values.push(updateData.awayScore);
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const query = `UPDATE matches SET ${fields.join(', ')} WHERE id = ?`;
      this.db.prepare(query).run(...values);

      return this.findById(id);
    } catch (error) {
      throw new Error(`Error updating match: ${error.message}`);
    }
  }

  // Delete match
  delete(id) {
    try {
      const match = this.findById(id);
      if (!match) {
        throw new Error('Match not found');
      }

      const query = 'DELETE FROM matches WHERE id = ?';
      this.db.prepare(query).run(id);

      return true;
    } catch (error) {
      throw new Error(`Error deleting match: ${error.message}`);
    }
  }

  // Get matches by stadium
  findByStadium(stadiumId) {
    try {
      const query = `
        SELECT * FROM matches 
        WHERE stadium_id = ? 
        ORDER BY match_date ASC, match_time ASC
      `;
      const matches = this.db.prepare(query).all(stadiumId);
      return matches.map(match => new Match(match));
    } catch (error) {
      throw new Error(`Error fetching matches by stadium: ${error.message}`);
    }
  }

  // Get available tickets count for a match
  getAvailableTicketsCount(matchId) {
    try {
      const query = `
        SELECT COUNT(*) as count FROM tickets 
        WHERE match_id = ? AND status = 'available'
      `;
      const result = this.db.prepare(query).get(matchId);
      return result ? result.count : 0;
    } catch (error) {
      throw new Error(`Error fetching available tickets: ${error.message}`);
    }
  }
}

module.exports = MatchRepository;