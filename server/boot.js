import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createDbFromEnv } from './db/index.js';
import { createApp } from './app.js';
import { PLACES, TROTRO_ROUTES } from './seedData.js';

// Token signing secret: JWT_SECRET in production. Locally, a generated
// secret is persisted next to the database so sessions survive restarts.
function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.warn('JWT_SECRET is not set — sessions will reset on every cold start. Set it in your Netlify environment.');
    return crypto.randomBytes(32).toString('hex');
  }
  const secretFile = path.resolve('data/.secret');
  try {
    return fs.readFileSync(secretFile, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    return secret;
  }
}

let bootPromise = null;

// One shared init for local serving and serverless cold starts.
export function boot() {
  if (!bootPromise) {
    bootPromise = (async () => {
      const db = await createDbFromEnv();
      await db.seedIfEmpty({ PLACES, TROTRO_ROUTES });
      const app = createApp(db, { secret: resolveSecret() });
      return { app, db };
    })();
  }
  return bootPromise;
}
