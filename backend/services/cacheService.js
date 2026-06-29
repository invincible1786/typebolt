const client = require('../config/redis');

/**
 * Get a value from Redis cache.
 * Returns the parsed JSON object or string, or null on cache miss or error.
 * @param {string} key - Redis key.
 * @returns {Promise<any>} Cached value or null.
 */
const get = async (key) => {
  try {
    // If client is not initialized or not ready, fail gracefully (cache miss)
    if (!client.isReady) {
      return null;
    }
    const value = await client.get(key);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.warn(`⚠️ Cache GET failed for key "${key}": ${error.message}`);
    return null;
  }
};

/**
 * Set a value in Redis cache with an optional TTL (time-to-live).
 * @param {string} key - Redis key.
 * @param {any} value - Value to cache (objects are auto-serialized to JSON).
 * @param {number} [ttlSeconds] - TTL in seconds.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
const set = async (key, value, ttlSeconds) => {
  try {
    if (!client.isReady) {
      return false;
    }
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (ttlSeconds) {
      await client.set(key, stringValue, { EX: ttlSeconds });
    } else {
      await client.set(key, stringValue);
    }
    return true;
  } catch (error) {
    console.warn(`⚠️ Cache SET failed for key "${key}": ${error.message}`);
    return false;
  }
};

/**
 * Delete a key from Redis cache.
 * @param {string} key - Redis key.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
const del = async (key) => {
  try {
    if (!client.isReady) {
      return false;
    }
    await client.del(key);
    return true;
  } catch (error) {
    console.warn(`⚠️ Cache DEL failed for key "${key}": ${error.message}`);
    return false;
  }
};

module.exports = {
  get,
  set,
  del
};
