// Simple in-memory cache with TTL
const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

function get(key) {
  const item = cache.get(key);
  if (item && Date.now() < item.expiry) {
    return item.data;
  }
  // Clean up expired item
  if (item) {
    cache.delete(key);
  }
  return null;
}

function set(key, data, ttl = DEFAULT_TTL) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
  });
}

function del(key) {
  cache.delete(key);
}

function clear() {
  cache.clear();
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now >= item.expiry) {
      cache.delete(key);
    }
  }
}, 60 * 1000); // Every minute

module.exports = { get, set, del, clear };
