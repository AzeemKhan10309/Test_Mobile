// subscriptions.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();
router.use(authenticate);

const PLANS = {
  free: { name: 'Free', maxTests: 3, price: 0 },
  pro: { name: 'Pro', maxTests: -1, price: 29, stripeId: 'price_pro_monthly' },
  enterprise: { name: 'Enterprise', maxTests: -1, price: 99, stripeId: 'price_enterprise_monthly' },
};

router.get('/plans', (req, res) => {
  res.json({ success: true, data: PLANS });
});

router.get('/status', asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.subscription });
}));

router.post('/checkout', asyncHandler(async (req, res) => {
  // Stripe integration placeholder
  res.json({
    success: true,
    message: 'Stripe integration requires STRIPE_SECRET_KEY. Configure in .env',
    checkoutUrl: '#',
  });
}));

export default router;
