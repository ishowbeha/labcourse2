const express = require('express');
const FootballController = require('../controllers/FootballController');

const createFootballRoutes = (sequelize) => {
  const router = express.Router();
  const footballController = new FootballController(sequelize);

  // GET /api/football/upcoming - Get upcoming matches from all leagues
  router.get('/upcoming', footballController.getUpcomingMatches);

  // GET /api/football/live - Get live matches
  router.get('/live', footballController.getLiveMatches);

  // GET /api/football/team/:teamName - Get matches for a specific team
  router.get('/team/:teamName', footballController.getTeamMatches);

  // GET /api/football/league/:leagueId - Get matches for a specific league
  router.get('/league/:leagueId', footballController.getLeagueMatches);

  // GET /api/football/leagues - Get available league IDs
  router.get('/leagues', footballController.getAvailableLeagues);

  // POST /api/football/sync - Sync API matches into local database
  router.post('/sync', footballController.syncMatches);

  return router;
};

module.exports = createFootballRoutes;