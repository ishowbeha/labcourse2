const express = require('express');
const AdminController = require('../controllers/AdminController');
const { authenticate, requireRole } = require('../middleware/auth');

const createAdminRoutes = (db) => {
  const router = express.Router();
  const controller = new AdminController(db);

  // Debug middleware
  router.use((req, res, next) => {
    console.log('Admin route:', req.method, req.path);
    console.log('Auth header:', req.headers.authorization ? 'Present' : 'Missing');
    next();
  });

  // All admin routes require authentication and admin role
  router.use(authenticate);
  router.use((req, res, next) => {
    console.log('Authenticated user:', req.user);
    next();
  });
  router.use(requireRole(['admin']));

  // Dashboard
  router.get('/stats', controller.getDashboardStats.bind(controller));

  // User Management
  router.get('/users', controller.getAllUsers.bind(controller));
  router.get('/users/:id', controller.getUserById.bind(controller));
  router.post('/users', controller.createUser.bind(controller));
  router.put('/users/:id', controller.updateUser.bind(controller));
  router.delete('/users/:id', controller.deleteUser.bind(controller));
  router.delete('/users/:id/permanent', controller.hardDeleteUser.bind(controller));

  // Roles
  router.get('/roles', controller.getAllRoles.bind(controller));

  // Reports - Ticket Sales
  router.get('/reports/ticket-sales', controller.getTicketSalesByMatch.bind(controller));
  router.get('/reports/revenue', controller.getRevenueAnalytics.bind(controller));
  router.get('/reports/top-matches', controller.getTopSellingMatches.bind(controller));

  // Orders Management
  router.get('/orders', controller.getOrders.bind(controller));
  router.get('/orders/:id', controller.getOrderById.bind(controller));
  router.patch('/orders/:id/status', controller.updateOrderStatus.bind(controller));
  router.delete('/orders/:id', controller.deleteOrder.bind(controller));

  return router;
};

module.exports = createAdminRoutes;