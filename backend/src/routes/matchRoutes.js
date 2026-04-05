const express = require('express');
const MatchController = require('../controllers/MatchController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Factory function to create router with database connection
const createMatchRoutes = (db) => {
  const matchController = new MatchController(db);

  // Public routes - anyone can view matches
  router.get('/', (req, res) => matchController.getAllMatches(req, res));
  router.get('/upcoming', (req, res) => matchController.getUpcomingMatches(req, res));
  router.get('/:id', (req, res) => matchController.getMatchById(req, res));
  router.get('/team/:team', (req, res) => matchController.getMatchesByTeam(req, res));

  // Protected routes - require authentication
  router.use(authenticate);

  // Admin only routes
  router.post('/', requireRole(['admin', 'manager']), (req, res) => matchController.createMatch(req, res));
  router.put('/:id', requireRole(['admin', 'manager']), (req, res) => matchController.updateMatch(req, res));
  router.delete('/:id', requireRole(['admin']), (req, res) => matchController.deleteMatch(req, res));

  return router;
};

module.exports = createMatchRoutes;