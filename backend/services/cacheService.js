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

/**
 * Add or update a member score in a Redis Sorted Set.
 * @param {string} key - Redis key.
 * @param {number} score - Score value (e.g. WPM).
 * @param {string} member - Member identifier (e.g. userId:username).
 * @returns {Promise<boolean>}
 */
const zAdd = async (key, score, member) => {
  try {
    if (!client.isReady) {
      return false;
    }
    await client.zAdd(key, [{ score: Number(score), value: String(member) }]);
    return true;
  } catch (error) {
    console.warn(`⚠️ Cache ZADD failed for key "${key}": ${error.message}`);
    return false;
  }
};

/**
 * Get top scored members from a Redis Sorted Set (highest to lowest).
 * @param {string} key - Redis key.
 * @param {number} [start=0] - Starting rank index.
 * @param {number} [stop=9] - Ending rank index.
 * @returns {Promise<Array<{value: string, score: number}>|null>}
 */
const zRevRangeWithScores = async (key, start = 0, stop = 9) => {
  try {
    if (!client.isReady) {
      return null;
    }
    const results = await client.zRangeWithScores(key, start, stop, { REV: true });
    return results;
  } catch (error) {
    console.warn(`⚠️ Cache ZREVRANGE failed for key "${key}": ${error.message}`);
    return null;
  }
};

module.exports = {
  get,
  set,
  del,
  zAdd,
  zRevRangeWithScores
};
