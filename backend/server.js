const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const validateEnv = require('./config/validateEnv');
const errorHandler = require('./middlewares/errorHandler');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers
app.use(helmet());

// CORS configuration with production allowlist
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin / allowed origins
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/typing'));

// Health check
const mongoose = require('mongoose');
const redisClient = require('./config/redis');

const checkHealth = (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
  
  const status = (dbStatus === 'connected' && redisStatus === 'connected') ? 'ok' : 'degraded';
  
  res.json({
    status,
    services: {
      db: dbStatus,
      redis: redisStatus
    }
  });
};

app.get('/health', checkHealth);
app.get('/api/health', checkHealth);

// Centralized error handler
app.use(errorHandler);

// Only validate env, connect DB, connect Redis, and start server if run directly
if (require.main === module) {
  // Validate environment variables at startup
  validateEnv();

  // Connect to MongoDB
  connectDB();

  // Connect to Redis
  const redisClient = require('./config/redis');
  redisClient.connect().catch((err) => {
    console.error('❌ Failed to establish initial Redis connection:', err.message);
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;