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

  // All admin routes require authentication
  router.use(authenticate);
  router.use((req, res, next) => {
    console.log('Authenticated user:', req.user);
    next();
  });

  // Favorites (any authenticated user) — before admin role check
  router.get('/favorites', controller.getUserFavorites.bind(controller));
  router.post('/favorites/toggle', controller.toggleFavorite.bind(controller));

  // Coupon Validation (any authenticated user during checkout)
  router.post('/coupons/validate', controller.validateCoupon.bind(controller));

  // Admin-only routes below
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

  // Dynamic Report Generation
  router.post('/reports/dynamic', controller.generateDynamicReport.bind(controller));

  // Coupons Management (admin only)
  router.get('/coupons', controller.getAllCoupons.bind(controller));
  router.post('/coupons', controller.createCoupon.bind(controller));
  router.patch('/coupons/:id/toggle', controller.toggleCouponStatus.bind(controller));
  router.delete('/coupons/:id', controller.deleteCoupon.bind(controller));

  // Orders Management
  router.get('/orders', controller.getOrders.bind(controller));
  router.get('/orders/:id', controller.getOrderById.bind(controller));
  router.patch('/orders/:id/status', controller.updateOrderStatus.bind(controller));
  router.post('/orders/:id/refund', controller.refundOrder.bind(controller));
  router.delete('/orders/:id', controller.hardDeleteOrder.bind(controller));

  // Ticket Management (admin)
  router.get('/tickets', controller.getTickets.bind(controller));
  router.patch('/tickets/:id/status', controller.updateTicketStatus.bind(controller));
  router.post('/tickets/generate', controller.generateTicketsForMatch.bind(controller));
  router.delete('/tickets/match/:matchId', controller.deleteTicketsForMatch.bind(controller));

  return router;
};

module.exports = createAdminRoutes;