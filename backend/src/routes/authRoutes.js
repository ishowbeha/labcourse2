const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Factory function to create routes with database connection
const createAuthRoutes = (db) => {
  const authController = new AuthController(db);

  // Public routes
  router.post('/register', (req, res) => authController.register(req, res));
  router.post('/login', (req, res) => authController.login(req, res));
  router.post('/logout', (req, res) => authController.logout(req, res));
  router.get('/check-session', (req, res) => authController.checkSession(req, res));
  router.post('/refresh-token', (req, res) => authController.refreshToken(req, res));

  // Protected routes (require authentication)
  router.get('/profile', authenticate, (req, res) => authController.getProfile(req, res));
  router.put('/profile', authenticate, (req, res) => authController.updateProfile(req, res));

  // Admin routes (require admin role)
  router.get('/roles', authenticate, requireRole(['admin']), (req, res) => authController.getRoles(req, res));
  router.get('/permissions', authenticate, requireRole(['admin']), (req, res) => authController.getPermissions(req, res));

  return router;
};

module.exports = createAuthRoutes;