const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const newsletter = require('../controllers/newsletterController');

router.post('/subscribe', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20,
  standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' } }), newsletter.subscribe);
router.post('/confirm', newsletter.confirm);
router.post('/unsubscribe', newsletter.unsubscribe);

module.exports = router;
