const express = require('express');
const UserController = require('../controllers/UserController');

const router = express.Router();

// Factory function to create router with database connection
const createUserRoutes = (db) => {
  const userController = new UserController(db);

  // Public routes
  router.post('/login', (req, res) => userController.login(req, res));

  // User management routes
  router.get('/', (req, res) => userController.getAllUsers(req, res));
  router.get('/:id', (req, res) => userController.getUserById(req, res));
  router.post('/', (req, res) => userController.createUser(req, res));
  router.put('/:id', (req, res) => userController.updateUser(req, res));
  router.delete('/:id', (req, res) => userController.deleteUser(req, res));

  return router;
};

module.exports = createUserRoutes;