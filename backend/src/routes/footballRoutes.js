const express = require('express');
const FootballController = require('../controllers/FootballController');

const createFootballRoutes = (sequelize) => {
  const router = express.Router();
  const footballController = new FootballController(sequelize);

  // GET /api/football/upcoming - Get upcoming matches from all competitions
  router.get('/upcoming', footballController.getUpcomingMatches);

  // GET /api/football/live - Get live matches
  router.get('/live', footballController.getLiveMatches);

  // GET /api/football/team/:teamName - Get matches for a specific team
  router.get('/team/:teamName', footballController.getTeamMatches);

  // GET /api/football/competition/:code - Get matches for a competition (e.g. WC, CL, PL)
  router.get('/competition/:code', footballController.getCompetitionMatches);

  // GET /api/football/competitions - Get available competition codes
  router.get('/competitions', footballController.getAvailableCompetitions);

  // POST /api/football/sync - Sync API matches into local database
  router.post('/sync', footballController.syncMatches);

  return router;
};

module.exports = createFootballRoutes;