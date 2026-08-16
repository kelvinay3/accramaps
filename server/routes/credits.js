import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ah } from '../util/asyncHandler.js';

const REDEMPTIONS = {
  'wayfinder-1mo': { cost: 300, label: '1 month Wayfinder' },
  'remove-ads-7d':  { cost: 80,  label: 'Remove ads 7 days' },
  'police-views-10': { cost: 50, label: '10 police checkpoint views' },
  'offline-accra-30d': { cost: 200, label: 'Offline Greater Accra 30 days' },
};

export function creditRoutes(db) {
  const router = Router();

  router.get('/', requireAuth, ah(async (req, res) => {
    const balance = await db.credits.balance(req.user.id);
    const history = await db.credits.history(req.user.id, 20);
    res.json({ balance, history, redemptions: REDEMPTIONS });
  }));

  router.post('/redeem', requireAuth, ah(async (req, res) => {
    const { type } = req.body || {};
    const item = REDEMPTIONS[type];
    if (!item) return res.status(400).json({ error: 'Unknown redemption type' });
    const balance = await db.credits.balance(req.user.id);
    if (balance < item.cost) return res.status(402).json({ error: 'Insufficient credits', balance, required: item.cost });
    await db.credits.add({ userId: req.user.id, amount: -item.cost, reason: `Redeemed: ${item.label}` });
    const newBalance = await db.credits.balance(req.user.id);
    res.json({ ok: true, redeemed: item.label, balance: newBalance });
  }));

  return router;
}
