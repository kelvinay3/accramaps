import { verifyToken } from '../util/token.js';

export function authMiddleware(secret) {
  return (req, res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    req.user = null;
    if (token) {
      const payload = verifyToken(token, secret);
      if (payload?.uid) req.user = { id: payload.uid };
    }
    next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in required' });
  next();
}
