const mongoose = require('mongoose');
const TypingResult = require('../models/TypingResult');
const User = require('../models/User');
const { ValidationError } = require('../utils/customErrors');
const { calculateAccuracy } = require('../utils/accuracy');
const cacheService = require('./cacheService');

const PARAGRAPH_BANK = [
  "Technology has revolutionized the way we communicate, work, and live. From the early days of bulky desktop computers to the modern era of sleek smartphones and smart home devices, our lives are deeply intertwined with digital systems. As technology continues to evolve at a breakneck pace, staying adaptable and continuously learning new digital skills has become essential for personal and professional growth in the twenty-first century.",
  "The sun is the star at the center of the Solar System. It is a nearly perfect ball of hot plasma, heated to incandescence by nuclear fusion reactions in its core. The sun radiates this energy mainly as light, ultraviolet, and infrared radiation, providing the most important source of energy for life on Earth. Its gravity holds the solar system together, keeping everything from the biggest planets to tiny debris in orbit.",
  "Deep learning is a subset of machine learning, which is in turn a subset of artificial intelligence. It is based on artificial neural networks with multiple layers, hence the name deep. These neural networks attempt to simulate the behavior of the human brain, allowing it to learn from large amounts of data. By training these systems on massive datasets, they can achieve human-like accuracy in recognizing speech and images.",
  "The oceans cover more than seventy percent of the Earth's surface and play a crucial role in regulating the planet's climate. They absorb a large portion of the heat and carbon dioxide produced by human activities, helping to buffer the impacts of global warming. Despite their vast size and importance, the oceans remain largely unexplored, with countless marine species and underwater landscapes still waiting to be discovered.",
  "Writing clean and readable code is just as important as writing functional code. When code is easy to read, it becomes significantly easier to maintain, debug, and scale over time. Developers should strive to follow established style guides, use descriptive variable names, and write small, focused functions. Remember that code is read far more often than it is written, so make the experience pleasant for your future self.",
  "The Great Wall of China is a series of fortifications that were built across the historical northern borders of ancient Chinese states and Imperial China. It was constructed to protect against nomadic groups from the Eurasian Steppe. With a history of more than two thousand years, the wall stretches over thirteen thousand miles and stands as one of the most impressive architectural achievements in human history.",
  "Photosynthesis is the biological process by which green plants, algae, and some bacteria convert light energy into chemical energy. Using sunlight, these organisms turn carbon dioxide and water into oxygen and energy-rich sugars. This process is fundamental to life on Earth as it provides the primary source of organic material and oxygen, supporting the vast majority of food chains and ecosystems across our planet.",
  "A database index is a data structure that improves the speed of data retrieval operations on a database table. However, this speed comes at the cost of additional writes and storage space to maintain the index. Selecting the right fields to index requires a deep understanding of the queries your application runs most frequently, balancing read acceleration against the write performance overhead of index maintenance.",
  "The theory of relativity, developed by Albert Einstein, revolutionized theoretical physics and astronomy in the early twentieth century. It consists of two theories: special relativity, which addresses the physics of speed and motion in the absence of gravity, and general relativity, which provides a unified description of gravity as a geometric property of space and time. It completely changed our view of the universe.",
  "Coffee is one of the most popular beverages in the world, enjoyed by millions of people every day. Prepared from the roasted seeds of the Coffea plant, it has a rich history dating back centuries to the ancient coffee forests of Ethiopia. Whether consumed black, with milk, or sweetened, coffee contains caffeine, a natural stimulant that helps improve focus, alertness, and cognitive performance when consumed in moderation.",
  "Monarch butterflies are famous for their incredible annual migration. Every autumn, millions of these delicate insects fly thousands of miles from North America to their overwintering sites in the forests of central Mexico. Guided by an internal solar compass and magnetic cues, they navigate with astonishing precision, a journey that spans multiple generations and remains one of nature's greatest wonders.",
  "Renewable energy is energy that is collected from renewable resources, which are naturally replenished on a human timescale. These resources include sunlight, wind, rain, tides, waves, and geothermal heat. Transitioning to renewable energy is critical to reducing carbon emissions, combating global warming, and establishing a sustainable future that does not depend on finite and polluting fossil fuel reserves.",
  "The concept of time management involves planning and exercising conscious control over the amount of time spent on specific activities. By structuring your day and prioritizing tasks, you can increase efficiency, reduce stress, and achieve a better work-life balance. Effective time management empowers individuals to accomplish more in less time, freeing up space for personal pursuits and creative thinking.",
  "Modern architecture emphasizes function, simplicity, and the integration of buildings with their natural surroundings. Breaking away from ornate historical styles, modern designs favor clean lines, open floor plans, and materials like steel, concrete, and large panes of glass. This architectural movement seeks to create structures that are both aesthetically pleasing and highly practical for modern living.",
  "The universe is an vast expanse of space containing all matter and energy, from tiny subatomic particles to massive galaxies. Cosmologists estimate that the universe is approximately thirteen point eight billion years old, expanding continuously since the Big Bang. Exploring the cosmos through powerful telescopes allows us to peer back in time and uncover the mysteries of black holes, dark matter, and distant planets.",
  "Bicycle commuting is a healthy, economical, and environmentally friendly way to travel to work or school. By choosing to ride a bicycle instead of driving a car, commuters can incorporate physical exercise into their daily routines, reduce traffic congestion, and lower their carbon footprint. Many cities are expanding their cycling infrastructure with dedicated bike lanes to encourage this active form of transport.",
  "The printing press, invented by Johannes Gutenberg in the fifteenth century, is widely considered one of the most influential events in human history. By enabling the mass production of books, it democratized access to information, accelerated the spread of scientific knowledge, and fueled the Renaissance. The printing press laid the foundation for the modern information age and transformed global education.",
  "A healthy diet is essential for maintaining physical well-being and preventing chronic diseases. Eating a variety of nutrient-rich foods, including fruits, vegetables, whole grains, lean proteins, and healthy fats, provides the body with the energy and nutrients it needs to function optimally. Combined with regular physical activity, a balanced diet is one of the most powerful tools for longevity and vitality.",
  "Computer programs are structured sequences of instructions designed to perform specific computational tasks. From low-level assembly operating close to hardware registers to declarative high-level functional paradigms, programming languages empower humans to abstract complex mathematical problems into elegant, maintainable solutions.",
  "Space exploration stands as humanity's boldest endeavor to understand our origin and destiny among the stars. Robotic probes like Voyager have ventured beyond the heliosphere into interstellar space, carrying greetings from Earth while relaying invaluable telemetry from the cosmic frontier."
];

// Get random paragraph with zero-latency local fallback and Redis caching
const getRandomParagraph = async () => {
  const cached = await cacheService.get('paragraph:random');
  if (cached) {
    if (Array.isArray(cached) && cached.length > 0) {
      return cached[Math.floor(Math.random() * cached.length)];
    }
    if (typeof cached === 'string') {
      return cached;
    }
  }

  // Pre-seed cache with local bank so subsequent hits are instant
  await cacheService.set('paragraph:random', PARAGRAPH_BANK, 3600);
  const randomParagraph = PARAGRAPH_BANK[Math.floor(Math.random() * PARAGRAPH_BANK.length)];
  return randomParagraph;
};

// Save typing result (with server-side recomputation and anti-cheat validation)
const saveResult = async ({ userId, typedText, timeTaken, errors, errorCount, paragraph }) => {
  const finalErrors = typeof errorCount === 'number' ? errorCount : errors;

  if (typeof typedText !== 'string' || typeof timeTaken !== 'number' || typeof finalErrors !== 'number') {
    throw new ValidationError('Invalid request data');
  }

  // Recompute values server-side using standard chars/5 formula
  let computedWpm = 0;
  if (timeTaken > 0) {
    computedWpm = Math.round((typedText.length / 5) / (timeTaken / 60));
  }

  const computedAccuracy = calculateAccuracy(typedText.length, finalErrors);

  const result = new TypingResult({
    user: new mongoose.Types.ObjectId(userId),
    wpm: computedWpm,
    accuracy: computedAccuracy,
    errorCount: finalErrors,
    timeTaken,
    paragraph
  });

  await result.save();

  // Invalidate user stats cache when a new test is submitted
  await cacheService.del(`stats:${userId}`);
  // Invalidate leaderboard cache
  await cacheService.del('leaderboard:top');

  // Update Redis Sorted Set leaderboard if user exists
  try {
    const user = await User.findById(userId).select('username').lean();
    if (user && user.username) {
      await cacheService.zAdd('leaderboard:global', computedWpm, `${userId}:${user.username}`);
    }
  } catch (err) {
    console.warn(`Could not update Redis sorted set for user ${userId}:`, err.message);
  }

  return result;
};

// Get user stats using aggregation
const getUserStats = async (userId) => {
  const cacheKey = `stats:${userId}`;
  
  const cachedStats = await cacheService.get(cacheKey);
  if (cachedStats) {
    return cachedStats;
  }

  const stats = await TypingResult.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$user",
        totalTests: { $sum: 1 },
        averageWpm: { $avg: "$wpm" },
        bestWpm: { $max: "$wpm" },
        averageAccuracy: { $avg: "$accuracy" }
      }
    }
  ]);

  if (stats.length === 0) {
    const emptyStats = {
      totalTests: 0,
      averageWpm: 0,
      bestWpm: 0,
      averageAccuracy: 0
    };
    await cacheService.set(cacheKey, emptyStats, 300);
    return emptyStats;
  }

  const { totalTests, averageWpm, bestWpm, averageAccuracy } = stats[0];

  const resultStats = {
    totalTests,
    averageWpm: Math.round(averageWpm * 100) / 100,
    bestWpm,
    averageAccuracy: Math.round(averageAccuracy * 100) / 100
  };

  await cacheService.set(cacheKey, resultStats, 300);

  return resultStats;
};

// Get user history with pagination
const getUserHistory = async ({ userId, page = 1, limit = 20 }) => {
  const sanitizedLimit = Math.min(Math.max(1, limit), 100);
  const skip = (page - 1) * sanitizedLimit;
  
  const results = await TypingResult.find({ user: new mongoose.Types.ObjectId(userId) })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(sanitizedLimit);

  const total = await TypingResult.countDocuments({ user: new mongoose.Types.ObjectId(userId) });

  return {
    results,
    total,
    page,
    limit: sanitizedLimit,
    totalPages: Math.ceil(total / sanitizedLimit)
  };
};

// Get global leaderboard (Redis sorted set with MongoDB fallback)
const getLeaderboard = async (limit = 10) => {
  const sanitizedLimit = Math.min(Math.max(1, limit), 50);
  const cacheKey = `leaderboard:top:${sanitizedLimit}`;

  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 1. Try Redis Sorted Set
  const redisScores = await cacheService.zRevRangeWithScores('leaderboard:global', 0, sanitizedLimit - 1);
  if (redisScores && redisScores.length > 0) {
    const leaderboard = redisScores.map((entry, index) => {
      const parts = entry.value.split(':');
      const username = parts.length > 1 ? parts.slice(1).join(':') : parts[0];
      return {
        rank: index + 1,
        username,
        wpm: entry.score
      };
    });
    await cacheService.set(cacheKey, leaderboard, 60);
    return leaderboard;
  }

  // 2. Fallback to MongoDB Aggregation
  const mongoLeaders = await TypingResult.aggregate([
    { $sort: { wpm: -1, timestamp: -1 } },
    {
      $group: {
        _id: "$user",
        wpm: { $max: "$wpm" },
        accuracy: { $first: "$accuracy" },
        timestamp: { $first: "$timestamp" }
      }
    },
    { $sort: { wpm: -1 } },
    { $limit: sanitizedLimit },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userInfo"
      }
    },
    { $unwind: "$userInfo" },
    {
      $project: {
        _id: 1,
        username: "$userInfo.username",
        wpm: 1,
        accuracy: 1,
        timestamp: 1
      }
    }
  ]);

  const leaderboard = mongoLeaders.map((item, index) => ({
    rank: index + 1,
    username: item.username,
    wpm: item.wpm,
    accuracy: item.accuracy,
    timestamp: item.timestamp
  }));

  // Cache for 60 seconds
  await cacheService.set(cacheKey, leaderboard, 60);
  return leaderboard;
};

module.exports = {
  getRandomParagraph,
  saveResult,
  getUserStats,
  getUserHistory,
  getLeaderboard
};
