// Minimal in-memory fixed-window rate limiter (per IP + route group).
// Good enough for a single-process deployment; swap for Redis when scaling out.

const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 60, key = 'default' } = {}) {
  return (req, res, next) => {
    const id = `${key}:${req.ip}`;
    const now = Date.now();
    let bucket = buckets.get(id);
    if (!bucket || now - bucket.start >= windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(id, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((bucket.start + windowMs - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests — slow down small 🙏' });
    }
    next();
  };
}

// Periodically drop stale buckets so the map doesn't grow unbounded.
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [id, bucket] of buckets) {
    if (now - bucket.start > 10 * 60_000) buckets.delete(id);
  }
}, 5 * 60_000);
sweeper.unref();
