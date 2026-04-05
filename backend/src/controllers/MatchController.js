const MatchService = require('../services/MatchService');

class MatchController {
  constructor(db) {
    this.matchService = new MatchService(db);
  }

  // Get all matches
  async getAllMatches(req, res) {
    try {
      const { status, competition, startDate, endDate, team } = req.query;
      
      const filters = { status, competition, startDate, endDate, team };
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      const matches = await this.matchService.getAllMatches(filters);
      res.json({ success: true, data: matches, count: matches.length });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get match by ID
  async getMatchById(req, res) {
    try {
      const { id } = req.params;
      const match = await this.matchService.getMatchById(id);
      res.json({ success: true, data: match });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // Create new match
  async createMatch(req, res) {
    try {
      const matchData = req.body;
      const match = await this.matchService.createMatch(matchData);
      res.status(201).json({ success: true, data: match });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Update match
  async updateMatch(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const match = await this.matchService.updateMatch(id, updateData);
      res.json({ success: true, data: match });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Delete match
  async deleteMatch(req, res) {
    try {
      const { id } = req.params;
      await this.matchService.deleteMatch(id);
      res.json({ success: true, message: 'Match deleted successfully' });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // Get upcoming matches
  async getUpcomingMatches(req, res) {
    try {
      const matches = await this.matchService.getUpcomingMatches();
      res.json({ success: true, data: matches, count: matches.length });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get matches by team
  async getMatchesByTeam(req, res) {
    try {
      const { team } = req.params;
      const matches = await this.matchService.getMatchesByTeam(team);
      res.json({ success: true, data: matches, count: matches.length });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = MatchController;