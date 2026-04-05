const MatchRepository = require('../repositories/MatchRepository');

class MatchService {
  constructor(db) {
    this.matchRepository = new MatchRepository(db);
  }

  // Get all matches with optional filters
  async getAllMatches(filters = {}) {
    return this.matchRepository.findAll(filters);
  }

  // Get match by ID
  async getMatchById(id) {
    return this.matchRepository.findById(id);
  }

  // Create new match
  async createMatch(matchData) {
    // Validate required fields
    if (!matchData.homeTeam || !matchData.awayTeam || !matchData.stadiumId || !matchData.matchDate || !matchData.matchTime) {
      throw new Error('Home team, away team, stadium, date, and time are required');
    }

    // Validate base price
    if (!matchData.basePrice || matchData.basePrice <= 0) {
      throw new Error('Valid base price is required');
    }

    // Validate match date is in the future
    const matchDateTime = new Date(`${matchData.matchDate}T${matchData.matchTime}`);
    if (matchDateTime < new Date()) {
      throw new Error('Match date must be in the future');
    }

    return this.matchRepository.create(matchData);
  }

  // Update match
  async updateMatch(id, updateData) {
    return this.matchRepository.update(id, updateData);
  }

  // Delete match
  async deleteMatch(id) {
    return this.matchRepository.delete(id);
  }

  // Get upcoming matches
  async getUpcomingMatches(limit = 10) {
    return this.matchRepository.findAll({
      status: 'scheduled',
      includePast: false
    });
  }

  // Get matches by competition
  async getMatchesByCompetition(competition) {
    return this.matchRepository.findAll({ competition });
  }

  // Get matches by team
  async getMatchesByTeam(team) {
    return this.matchRepository.findAll({ team });
  }

  // Get matches by stadium
  async getMatchesByStadium(stadiumId) {
    return this.matchRepository.findByStadium(stadiumId);
  }

  // Get available tickets for a match
  async getAvailableTickets(matchId) {
    return this.matchRepository.getAvailableTicketsCount(matchId);
  }

  // Update match status (for live scores, etc.)
  async updateMatchStatus(id, status, homeScore, awayScore) {
    const updateData = { status };
    if (homeScore !== undefined) updateData.homeScore = homeScore;
    if (awayScore !== undefined) updateData.awayScore = awayScore;
    
    return this.matchRepository.update(id, updateData);
  }
}

module.exports = MatchService;