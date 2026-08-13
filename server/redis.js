import { createClient } from 'redis';

// Redis is only used to smooth over brief disconnects (grace period before
// flipping a user offline) and an unused geo index — nothing the app needs
// to function. If REDIS_URL isn't set, skip connecting entirely and fall
// back to a no-op stub so the server can still boot without it.
const noopRedis = {
  get: async () => null,
  set: async () => 'OK',
  geoAdd: async () => 0
};

let client = noopRedis;

if (process.env.REDIS_URL) {
  client = createClient({ url: process.env.REDIS_URL });
  client.on('error', (err) => console.error('Redis error:', err));
  await client.connect();
} else {
  console.warn('REDIS_URL not set — running without Redis (online-status grace period disabled).');
}

export const redis = client;
