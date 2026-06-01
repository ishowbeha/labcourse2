const FootballApiService = require('../services/FootballApiService');
const FootballSyncService = require('../services/FootballSyncService');

class FootballController {
  constructor(sequelize) {
    this.footballApi = new FootballApiService();
    this.syncService = sequelize ? new FootballSyncService(sequelize) : null;
  }

  /**
   * GET /api/football/upcoming
   * Get upcoming matches from all relevant leagues
   */
  getUpcomingMatches = async (req, res, next) => {
    try {
      if (!this.footballApi.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'API-Football is not configured. Set API_FOOTBALL_KEY in .env',
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
          message: 'API-Football is not configured. Set API_FOOTBALL_KEY in .env',
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
          message: 'API-Football is not configured. Set API_FOOTBALL_KEY in .env',
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
   * GET /api/football/league/:leagueId
   * Get matches for a specific league
   */
  getLeagueMatches = async (req, res, next) => {
    try {
      if (!this.footballApi.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'API-Football is not configured. Set API_FOOTBALL_KEY in .env',
          data: []
        });
      }

      const leagueId = parseInt(req.params.leagueId);
      const season = parseInt(req.query.season) || 2026;
      const limit = parseInt(req.query.limit) || 20;
      const matches = await this.footballApi.getUpcomingMatches(leagueId, season, limit);

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
   * GET /api/football/leagues
   * Get available league IDs
   */
  getAvailableLeagues = async (req, res, next) => {
    try {
      const leagues = this.footballApi.getLeagueIds();
      
      const leagueNames = {
        albania: 'Kategoria Superiore (Albania)',
        kosovo: 'Superliga (Kosovo)',
        champions: 'UEFA Champions League',
        euro: 'Euro Championship',
        nations: 'UEFA Nations League',
        world: 'World Cup'
      };

      const formatted = Object.entries(leagues).map(([key, id]) => ({
        key,
        id,
        name: leagueNames[key] || key
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
          message: 'API-Football is not configured. Set API_FOOTBALL_KEY in .env',
          synced: 0
        });
      }

      const result = await this.syncService.syncUpcomingMatches();

      res.json({
        success: true,
        message: result.synced > 0 
          ? `Successfully synced ${result.synced} matches from API-Football`
          : 'No new matches to sync',
        ...result
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = FootballController;
