const express = require('express');
const OrderController = require('../controllers/OrderController');
const { authenticate } = require('../middleware/auth');

const createOrderRoutes = (pool) => {
  const router = express.Router();
  const controller = new OrderController(pool);

  // All order routes require authentication
  router.use(authenticate);

  // Purchase tickets
  router.post('/purchase', (req, res, next) => controller.purchaseTickets(req, res, next));

  // Get user's orders
  router.get('/', (req, res, next) => controller.getUserOrders(req, res, next));

  return router;
};

module.exports = createOrderRoutes;