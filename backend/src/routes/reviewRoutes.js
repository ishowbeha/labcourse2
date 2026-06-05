const express = require('express');
const ReviewController = require('../controllers/ReviewController');
const { authenticate, requireRole } = require('../middleware/auth');

const createReviewRoutes = (db) => {
  const router = express.Router();
  const controller = new ReviewController(db);

  // All review routes require authentication
  router.use(authenticate);

  // User routes
  router.get('/my', (req, res, next) => controller.getMyReviews(req, res, next));
  router.post('/', (req, res, next) => controller.createReview(req, res, next));
  router.delete('/:id', (req, res, next) => controller.deleteReview(req, res, next));

  // Match reviews (public)
  router.get('/match/:matchId', (req, res, next) => controller.getMatchReviews(req, res, next));

  // Admin routes
  router.get('/all', requireRole(['admin']), (req, res, next) => controller.getAllReviews(req, res, next));
  router.patch('/:id/approve', requireRole(['admin']), (req, res, next) => controller.approveReview(req, res, next));
  router.delete('/:id/admin', requireRole(['admin']), (req, res, next) => controller.adminDeleteReview(req, res, next));

  return router;
};

module.exports = createReviewRoutes;