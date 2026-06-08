const express = require('express');
const OrderController = require('../controllers/OrderController');
const { authenticate } = require('../middleware/auth');

const createOrderRoutes = (pool) => {
  const router = express.Router();
  const controller = new OrderController(pool);

  // Public: expose Stripe publishable key to the frontend
  router.get('/stripe-config', (req, res) => {
    const pk = process.env.STRIPE_PUBLISHABLE_KEY || '';
    if (!pk || pk.startsWith('pk_test_REPLACE')) {
      return res.status(500).json({ success: false, message: 'Stripe publishable key not configured.' });
    }
    res.json({ success: true, publishableKey: pk });
  });

  // All routes below require authentication
  router.use(authenticate);

  // Stripe: create a PaymentIntent (amount in cents sent by frontend)
  router.post('/create-payment-intent', (req, res, next) => controller.createPaymentIntent(req, res, next));

  // Purchase tickets (legacy)
  router.post('/purchase', (req, res, next) => controller.purchaseTickets(req, res, next));
  router.post('/simple-purchase', (req, res, next) => controller.saveSimpleOrder(req, res, next));

  // Get user's orders
  router.get('/', (req, res, next) => controller.getUserOrders(req, res, next));

  return router;
};

module.exports = createOrderRoutes;