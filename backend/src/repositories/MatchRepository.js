const { Op } = require('sequelize');
const Match = require('../models/Match');

class MatchRepository {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.Match = sequelize.models.Match;
    this.Stadium = sequelize.models.Stadium;
  }

  // Get all matches with optional filters
  async findAll(filters = {}) {
    try {
      const where = {};
      
      // Filter by status
      if (filters.status) {
        where.status = filters.status;
      }

      // Filter by competition
      if (filters.competition) {
        where.competition = filters.competition;
      }

      // Filter by date range
      if (filters.startDate) {
        where.matchDate = { [Op.gte]: filters.startDate };
      }

      if (filters.endDate) {
        if (where.matchDate) {
          where.matchDate[Op.lte] = filters.endDate;
        } else {
          where.matchDate = { [Op.lte]: filters.endDate };
        }
      }

      // Filter by team (home or away)
      if (filters.team) {
        where[Op.or] = [
          { homeTeam: { [Op.like]: `%${filters.team}%` } },
          { awayTeam: { [Op.like]: `%${filters.team}%` } }
        ];
      }

      // Only upcoming matches by default
      if (!filters.includePast) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0];
        
        where[Op.or] = [
          { matchDate: { [Op.gt]: today } },
          {
            [Op.and]: [
              { matchDate: today },
              { matchTime: { [Op.gte]: currentTime } }
            ]
          }
        ];
      }

      const matches = await this.Match.findAll({
        where,
        include: [{
          model: this.Stadium,
          attributes: ['name', 'city', 'capacity']
        }],
        order: [['matchDate', 'ASC'], ['matchTime', 'ASC']]
      });

      return matches;
    } catch (error) {
      throw new Error(`Error fetching matches: ${error.message}`);
    }
  }

  // Get match by ID
  async findById(id) {
    try {
      const match = await this.Match.findByPk(id, {
        include: [{
          model: this.Stadium,
          as: 'stadium',
          attributes: ['name', 'city', 'capacity']
        }]
      });
      
      if (!match) {
        throw new Error('Match not found');
      }
      
      return match;
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
      const match = await this.Match.create({
        homeTeam: matchData.homeTeam,
        awayTeam: matchData.awayTeam,
        stadiumId: matchData.stadiumId,
        matchDate: matchData.matchDate,
        matchTime: matchData.matchTime,
        competition: matchData.competition || 'Friendly',
        round: matchData.round || 'Group Stage',
        basePrice: matchData.basePrice,
        status: 'scheduled',
        createdBy: 1,
        updatedBy: 1
      });
      
      return await this.findById(match.id);
    } catch (error) {
      throw new Error(`Error creating match: ${error.message}`);
    }
  }

  // Update match
  async update(id, updateData) {
    try {
      const updateFields = {};
      
      if (updateData.homeTeam !== undefined) updateFields.homeTeam = updateData.homeTeam;
      if (updateData.awayTeam !== undefined) updateFields.awayTeam = updateData.awayTeam;
      if (updateData.stadiumId !== undefined) updateFields.stadiumId = updateData.stadiumId;
      if (updateData.matchDate !== undefined) updateFields.matchDate = updateData.matchDate;
      if (updateData.matchTime !== undefined) updateFields.matchTime = updateData.matchTime;
      if (updateData.competition !== undefined) updateFields.competition = updateData.competition;
      if (updateData.status !== undefined) updateFields.status = updateData.status;
      if (updateData.homeScore !== undefined) updateFields.homeScore = updateData.homeScore;
      if (updateData.awayScore !== undefined) updateFields.awayScore = updateData.awayScore;

      if (Object.keys(updateFields).length === 0) {
        return await this.findById(id);
      }

      await this.Match.update(updateFields, { where: { id } });
      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error updating match: ${error.message}`);
    }
  }

  // Delete match
  async delete(id) {
    try {
      const match = await this.findById(id);
      if (!match) {
        throw new Error('Match not found');
      }

      await this.Match.destroy({ where: { id } });
      return true;
    } catch (error) {
      throw new Error(`Error deleting match: ${error.message}`);
    }
  }

  // Get matches by stadium
  async findByStadium(stadiumId) {
    try {
      const matches = await this.Match.findAll({
        where: { stadiumId },
        include: [{
          model: this.Stadium,
          as: 'stadium',
          attributes: ['name', 'city', 'capacity']
        }],
        order: [['matchDate', 'ASC'], ['matchTime', 'ASC']]
      });
      return matches;
    } catch (error) {
      throw new Error(`Error fetching matches by stadium: ${error.message}`);
    }
  }

  // Get available tickets count for a match
  async getAvailableTicketsCount(matchId) {
    try {
      const Ticket = this.sequelize.models.Ticket;
      const count = await Ticket.count({
        where: { matchId, status: 'available' }
      });
      return count;
    } catch (error) {
      throw new Error(`Error fetching available tickets: ${error.message}`);
    }
  }
}

module.exports = MatchRepository;