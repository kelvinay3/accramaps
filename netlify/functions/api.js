// Netlify Function wrapping the whole Express API.
// netlify.toml redirects /api/* and /tiles/* here; serverless-http strips
// the function base path so Express sees the original /api/... URLs.
import serverless from 'serverless-http';
import { boot } from '../../server/boot.js';

let cachedHandler = null;

export const handler = async (event, context) => {
  if (!cachedHandler) {
    const { app } = await boot();
    cachedHandler = serverless(app, {
      basePath: '/.netlify/functions/api',
      binary: ['image/png', 'image/jpeg', 'image/webp'],
    });
  }
  return cachedHandler(event, context);
};
