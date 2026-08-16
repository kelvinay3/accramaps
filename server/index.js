import { boot } from './boot.js';

const PORT = Number(process.env.PORT) || 3000;

const { app, db } = await boot();

// Sweep long-expired reports periodically to keep the table lean.
const sweeper = setInterval(() => {
  db.reports.sweepExpired().catch((err) => console.error('report sweep failed:', err.message));
}, 60 * 60_000);
sweeper.unref();

app.listen(PORT, () => {
  console.log(`🇬🇭 AccraMaps running → http://localhost:${PORT} (db: ${db.kind})`);
});
