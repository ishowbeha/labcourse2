const FootballApiService = require('../services/FootballApiService');
const FootballSyncService = require('../services/FootballSyncService');

class FootballController {
  constructor(sequelize) {
    this.footballApi = new FootballApiService();
    this.syncService = sequelize ? new FootballSyncService(sequelize) : null;
  }

  /**
   * GET /api/football/upcoming
   * Get upcoming matches from all relevant competitions
   */
  getUpcomingMatches = async (req, res, next) => {
    try {
      if (!this.footballApi.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Football API is not configured. Set FOOTBALL_DATA_KEY in .env',
          data: []
        });
      }

      const limit = parseInt(req.query.limit) || 50;
      const matches = await this.footballApi.getAllUpcomingMatches(limit);

      res.json({
        success: true,
        count: matches.length,
        data: matches
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/football/live
   * Get currently live matches
   */
  getLiveMatches = async (req, res, next) => {
    try {
      if (!this.footballApi.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Football API is not configured. Set FOOTBALL_DATA_KEY in .env',
          data: []
        });
      }

      const matches = await this.footballApi.getLiveMatches();

      res.json({
        success: true,
        count: matches.length,
        data: matches
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/football/team/:teamName
   * Get matches for a specific team
   */
  getTeamMatches = async (req, res, next) => {
    try {
      if (!this.footballApi.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Football API is not configured. Set FOOTBALL_DATA_KEY in .env',
          data: []
        });
      }

      const { teamName } = req.params;
      const limit = parseInt(req.query.limit) || 10;
      const matches = await this.footballApi.getMatchesByTeam(teamName, limit);

      res.json({
        success: true,
        count: matches.length,
        data: matches
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/football/competition/:id
   * Get matches for a specific league ID (e.g. 4669 = World Cup, 4328 = Premier League)
   */
  getCompetitionMatches = async (req, res, next) => {
    try {
      if (!this.footballApi.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Football API not available',
          data: []
        });
      }

      const leagueId = parseInt(req.params.id) || req.params.id;
      const limit = parseInt(req.query.limit) || 20;
      const matches = await this.footballApi.getUpcomingMatches(leagueId, limit);

      res.json({
        success: true,
        count: matches.length,
        data: matches
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/football/competitions
   * Get available competition codes
   */
  getAvailableCompetitions = async (req, res, next) => {
    try {
      const codes = this.footballApi.getCompetitionCodes();

      const formatted = Object.entries(codes).map(([name, code]) => ({
        name,
        code,
        key: name.toLowerCase().replace(/\s+/g, '_')
      }));

      res.json({
        success: true,
        data: formatted
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/football/sync
   * Sync external API matches into local MySQL database
   */
  syncMatches = async (req, res, next) => {
    try {
      if (!this.syncService) {
        return res.status(500).json({
          success: false,
          message: 'Database not available for sync'
        });
      }

      if (!this.footballApi.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Football API is not configured. Set FOOTBALL_DATA_KEY in .env',
          synced: 0
        });
      }

      const result = await this.syncService.syncUpcomingMatches();

      res.json({
        success: true,
        message: result.synced > 0 
          ? `Successfully synced ${result.synced} matches from football-data.org`
          : 'No new matches to sync',
        ...result
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = FootballController;