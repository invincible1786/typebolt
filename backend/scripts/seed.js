/**
 * Database & Cache Seeder Script for TypeBolt
 * 
 * Seeds realistic users, typing history tests, and Redis sorted-set leaderboard
 * entries so that new deployments and portfolio demonstrations show an active,
 * populated platform rather than empty states.
 * 
 * Usage:
 *   node backend/scripts/seed.js
 *   or: npm run seed --prefix backend
 */

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const TypingResult = require('../models/TypingResult');
const redisClient = require('../config/redis');

const SEED_USERS = [
  { username: 'keystroke_ninja', email: 'ninja@typebolt.dev', wpm: 124, accuracy: 98.6 },
  { username: 'terminal_ace', email: 'ace@typebolt.dev', wpm: 108, accuracy: 97.4 },
  { username: 'dev_velocity', email: 'velocity@typebolt.dev', wpm: 96, accuracy: 96.8 },
  { username: 'rust_enthusiast', email: 'rustacean@typebolt.dev', wpm: 88, accuracy: 99.1 },
  { username: 'algo_speed', email: 'algo@typebolt.dev', wpm: 82, accuracy: 95.5 },
  { username: 'syntax_surfer', email: 'surfer@typebolt.dev', wpm: 74, accuracy: 96.0 },
  { username: 'byte_sprinter', email: 'sprinter@typebolt.dev', wpm: 65, accuracy: 94.2 },
  { username: 'clean_coder', email: 'coder@typebolt.dev', wpm: 58, accuracy: 97.8 }
];

const SAMPLE_TEXTS = [
  "Simplicity is prerequisite for reliability. In software engineering as in life, elegance emerges not when there is nothing more to add, but when there is nothing left to take away.",
  "Premature optimization is the root of all evil in programming. We should forget about small efficiencies about ninety-seven percent of the time: premature optimization creates tangled dependencies.",
  "const debounce = (fn, ms = 300) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }; };",
  "A complex system that works is invariably found to have evolved from a simple system that worked. A complex system designed from scratch never works."
];

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/typebolt';
  console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log(' Connected to MongoDB');

  let redisAvailable = false;
  try {
    await redisClient.connect();
    redisAvailable = true;
    console.log(' Connected to Redis');
  } catch (err) {
    console.warn(' Redis connection failed. Seeding MongoDB only (Redis fallback mode will operate):', err.message);
  }

  try {
    console.log('\n Seeding initial users and typing results...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    for (const seedUser of SEED_USERS) {
      let user = await User.findOne({ username: seedUser.username });
      if (!user) {
        user = await User.create({
          username: seedUser.username,
          email: seedUser.email,
          password: hashedPassword
        });
        console.log(`  + Created user: ${user.username}`);
      } else {
        console.log(`  * Existing user: ${user.username}`);
      }

      // Check if user already has tests
      const existingTests = await TypingResult.countDocuments({ user: user._id });
      if (existingTests === 0) {
        // Create 3 realistic historical test runs
        const runs = [
          { wpm: seedUser.wpm, accuracy: seedUser.accuracy, daysAgo: 1 },
          { wpm: Math.max(20, seedUser.wpm - 8), accuracy: Math.max(80, seedUser.accuracy - 1.5), daysAgo: 4 },
          { wpm: Math.max(20, seedUser.wpm - 14), accuracy: Math.max(80, seedUser.accuracy - 2.8), daysAgo: 8 }
        ];

        for (const run of runs) {
          const paragraph = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
          const testDate = new Date(Date.now() - run.daysAgo * 24 * 60 * 60 * 1000);
          
          await TypingResult.create({
            user: user._id,
            wpm: run.wpm,
            accuracy: run.accuracy,
            errorCount: Math.round((100 - run.accuracy) * 0.5),
            timeTaken: 60,
            paragraph,
            timestamp: testDate
          });
        }
        console.log(`    Created 3 test sessions for ${user.username} (top: ${seedUser.wpm} WPM)`);
      }

      // Seed Redis Sorted Set
      if (redisAvailable && redisClient.isReady) {
        await redisClient.zAdd('leaderboard:global', [
          { score: seedUser.wpm, value: `${user._id}:${user.username}` }
        ]);
      }
    }

    // Invalidate cached leaderboard keys so fresh data appears immediately
    if (redisAvailable && redisClient.isReady) {
      const keys = await redisClient.keys('leaderboard:*');
      for (const k of keys) {
        if (k !== 'leaderboard:global') {
          await redisClient.del(k);
        }
      }
      console.log(' Flushed old leaderboard cache keys');
    }

    console.log('\n Seeding completed successfully!');
    console.log('Leaderboard populated with realistic high scores.');
  } catch (err) {
    console.error(' Seeding failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    if (redisAvailable && redisClient.isOpen) {
      await redisClient.quit();
    }
    process.exit(0);
  }
}

seed();
