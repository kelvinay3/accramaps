import crypto from 'node:crypto';
import { Router } from 'express';
import { signToken, hashPassword, verifyPassword } from '../util/token.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../util/rateLimit.js';
import { ah } from '../util/asyncHandler.js';
import { sendResetEmail } from '../util/email.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function authRoutes(db, secret) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 60_000, max: 20, key: 'auth' });

  router.post('/register', limiter, ah(async (req, res) => {
    const { email, name, password } = req.body || {};
    if (!EMAIL_RE.test(String(email || ''))) return res.status(400).json({ error: 'Valid email required' });
    if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'Name required (2+ characters)' });
    if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const cleanEmail = String(email).trim();
    const existing = await db.users.findByEmail(cleanEmail);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    let user;
    try {
      user = await db.users.create({
        email: cleanEmail,
        name: String(name).trim(),
        passwordHash: hashPassword(String(password)),
      });
    } catch (err) {
      // Unique-violation race between the check and the insert
      if (String(err.code) === '23505' || /UNIQUE/i.test(err.message)) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      throw err;
    }
    const token = signToken({ uid: user.id }, secret);
    res.status(201).json({ token, user });
  }));

  router.post('/login', limiter, ah(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await db.users.findByEmail(String(email || '').trim());
    if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
      return res.status(401).json({ error: 'Wrong email or password' });
    }
    const token = signToken({ uid: user.id }, secret);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }));

  router.get('/me', requireAuth, ah(async (req, res) => {
    const user = await db.users.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    res.json({ user });
  }));

  router.post('/forgot', limiter, ah(async (req, res) => {
    const { email } = req.body || {};
    // Always return 200 — never reveal whether an email exists
    if (!email || !db.resetTokens) return res.json({ ok: true });
    const user = await db.users.findByEmail(String(email).trim());
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
      await db.resetTokens.create(user.id, token, expiresAt);
      const origin = req.get('origin') || req.get('referer')?.replace(/\/$/, '') || 'https://accramaps.com';
      const resetUrl = `${origin}/?reset_token=${token}`;
      await sendResetEmail({ to: user.email, name: user.name, resetUrl });
    }
    res.json({ ok: true });
  }));

  router.post('/reset', limiter, ah(async (req, res) => {
    const { token, password } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Reset token required' });
    if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!db.resetTokens) return res.status(503).json({ error: 'Password reset unavailable' });
    const row = await db.resetTokens.findByToken(String(token));
    if (!row || row.used) return res.status(400).json({ error: 'Invalid or already-used reset link' });
    if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Reset link has expired — request a new one' });
    await db.users.updatePassword(row.user_id, hashPassword(String(password)));
    await db.resetTokens.markUsed(row.id);
    res.json({ ok: true });
  }));

  return router;
}
