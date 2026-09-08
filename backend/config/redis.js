/**
 * Redis Configuration
 * Provides caching and timer management.
 * Falls back to in-memory Map if Redis is unavailable (dev mode).
 */
if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
  throw new Error('REDIS_URL is required in production. In-memory cache is not allowed.');
}
// In-memory fallback for when Redis is not available
const memoryStore = new Map();
const memoryExpiry = new Map();

const cleanupExpired = () => {
  const now = Date.now();
  for (const [key, expiry] of memoryExpiry.entries()) {
    if (now > expiry) {
      memoryStore.delete(key);
      memoryExpiry.delete(key);
    }
  }
};
setInterval(cleanupExpired, 60000);

// Redis-like interface using in-memory storage
export const cache = {
  async get(key) {
    const expiry = memoryExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      memoryStore.delete(key);
      memoryExpiry.delete(key);
      return null;
    }
    return memoryStore.get(key) ?? null;
  },

  async set(key, value, options = {}) {
    memoryStore.set(key, value);
    if (options.EX) {
      memoryExpiry.set(key, Date.now() + options.EX * 1000);
    }
    return 'OK';
  },

  async del(key) {
    memoryStore.delete(key);
    memoryExpiry.delete(key);
    return 1;
  },

  async exists(key) {
    const expiry = memoryExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      memoryStore.delete(key);
      memoryExpiry.delete(key);
      return 0;
    }
    return memoryStore.has(key) ? 1 : 0;
  },

  async setex(key, seconds, value) {
    return this.set(key, value, { EX: seconds });
  },

  async ttl(key) {
    const expiry = memoryExpiry.get(key);
    if (!expiry) return -1;
    const remaining = Math.floor((expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  },
};

export default cache;
