// Simple in-memory cache - No Redis required!
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 300; // 5 minutes
  }

  async get(key) {
    const data = this.cache.get(key);
    if (!data) return null;
    
    // Check if expired
    if (data.expiry && data.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return data.value;
  }

  async set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000)
    });
    return true;
  }

  async del(key) {
    this.cache.delete(key);
    return true;
  }

  async invalidatePattern(pattern) {
    const patternRegex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (patternRegex.test(key)) {
        this.cache.delete(key);
      }
    }
    return true;
  }

  async getOrSet(key, fn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  clear() {
    this.cache.clear();
  }

  // Check if cache is available (always true for in-memory)
  isAvailable() {
    return true;
  }
}

// Create a singleton instance
const cache = new MemoryCache();

module.exports = cache;