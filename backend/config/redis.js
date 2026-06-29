const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

console.log(`Initializing Redis client with URL: ${redisUrl}`);

const client = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Auto-reconnect logic
      // Return a number of milliseconds to wait before retrying, or an Error to stop retrying
      const delay = Math.min(retries * 100, 3000);
      console.warn(`Redis connection lost. Reconnecting in ${delay}ms... (Attempt ${retries})`);
      return delay;
    }
  }
});

// Event listeners
client.on('connect', () => {
  console.log('✅ Redis client successfully connected to server');
});

client.on('ready', () => {
  console.log('✅ Redis client ready for operations');
});

client.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
});

client.on('end', () => {
  console.log('ℹ️ Redis client connection closed');
});

module.exports = client;
