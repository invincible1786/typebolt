const mongoose = require('mongoose');
const TypingResult = require('../models/TypingResult');
const User = require('../models/User');
const { ValidationError } = require('../utils/customErrors');
const { calculateAccuracy } = require('../utils/accuracy');
const cacheService = require('./cacheService');

/**
 * Categorized content pools for typing challenges.
 * Differentiates TypeBolt from standard clones by offering real code syntax,
 * curated prose on software architecture, and symbol-dense punctuation tests.
 */
const CONTENT_BANK = {
  prose: [
    "Simplicity is prerequisite for reliability. In software engineering as in life, elegance emerges not when there is nothing more to add, but when there is nothing left to take away.",
    "A complex system that works is invariably found to have evolved from a simple system that worked. A complex system designed from scratch never works and cannot be patched up to make it work.",
    "Premature optimization is the root of all evil in programming. We should forget about small efficiencies about ninety-seven percent of the time: premature optimization creates tangled dependencies.",
    "The function of good software architecture is to make the structure of the system mirror the problem domain so clearly that modifications feel natural and predictable rather than hazardous.",
    "Distributed systems are fundamentally about trade-offs between consistency, availability, and partition tolerance. Understanding failure modes is more valuable than assuming sunny-day execution.",
    "Computers are good at following instructions, but not at reading your mind. Code is written once, but read hundreds of times by engineers trying to debug production under pressure.",
    "The most dangerous phrase in systems architecture is we have always done it this way. Continuous questioning of constraints reveals where modern tooling makes legacy workarounds obsolete.",
    "Refactoring without automated tests is simply changing stuff and hoping for the best. Tests provide the confidence boundary required to simplify abstractions without fear of silent regressions."
  ],
  code: [
    "const debounce = (fn, ms = 300) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }; };",
    "async function fetchWithRetry(url, retries = 3, delay = 1000) { for (let i = 0; i < retries; i++) { try { return await fetch(url); } catch (err) { if (i === retries - 1) throw err; await new Promise(r => setTimeout(r, delay * Math.pow(2, i))); } } }",
    "type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }; function unwrap<T>(res: Result<T>): T { if (!res.ok) throw res.error; return res.value; }",
    "def binary_search(arr: list[int], target: int) -> int: left, right = 0, len(arr) - 1 while left <= right: mid = (left + right) // 2 if arr[mid] == target: return mid elif arr[mid] < target: left = mid + 1 else: right = mid - 1 return -1",
    "SELECT u.id, u.username, COUNT(t.id) AS total_tests, ROUND(AVG(t.wpm), 2) AS avg_wpm FROM users u LEFT JOIN typing_results t ON u.id = t.user_id GROUP BY u.id, u.username ORDER BY avg_wpm DESC LIMIT 10;",
    "func Worker(id int, jobs <-chan int, results chan<- int) { for j := range jobs { fmt.Printf(\"worker %d started job %d\\n\", id, j); time.Sleep(time.Second); results <- j * 2 } }",
    "fn find_max<T: PartialOrd + Copy>(slice: &[T]) -> Option<T> { slice.iter().copied().reduce(|acc, item| if item > acc { item } else { acc }) }"
  ],
  punctuation: [
    "Array.prototype.slice.call(arguments, 1); // Extract args: [0, 1, 2], { key: 'value', flag: true }",
    "regex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$/; isValid = regex.test(email); // (99.9% match)",
    "git commit -m \"fix(auth): resolve JWT expiration race condition (#402)\" --no-verify && git push origin main",
    "docker run -d --name redis-cache -p 6379:6379 -v redis_data:/data --restart=unless-stopped redis:7-alpine",
    "curl -X POST https://api.typebolt.dev/v1/telemetry -H \"Authorization: Bearer <TOKEN>\" -d '{\"wpm\":85,\"accuracy\":98.5}'",
    "const [state, dispatch] = useReducer((s, a) => ({ ...s, [a.type]: a.payload }), { count: 0, loading: false });"
  ]
};

// Flattened fallback list for general random queries
const ALL_PARAGRAPHS = [
  ...CONTENT_BANK.prose,
  ...CONTENT_BANK.code,
  ...CONTENT_BANK.punctuation
];

/**
 * Fetch a random typing challenge paragraph with Redis caching and in-memory fallback.
 * @param {string} [category='prose'] - Content category: 'prose', 'code', or 'punctuation'
 * @returns {Promise<string>} Selected challenge text
 */
const getRandomParagraph = async (category = 'prose') => {
  const validCategory = CONTENT_BANK[category] ? category : 'prose';
  const bank = CONTENT_BANK[validCategory] || ALL_PARAGRAPHS;
  const cacheKey = `paragraph:random:${validCategory}`;

  const cached = await cacheService.get(cacheKey);
  if (cached) {
    if (Array.isArray(cached) && cached.length > 0) {
      return cached[Math.floor(Math.random() * cached.length)];
    }
    if (typeof cached === 'string') {
      return cached;
    }
  }

  // Pre-seed cache with category bank
  await cacheService.set(cacheKey, bank, 3600);
  const randomParagraph = bank[Math.floor(Math.random() * bank.length)];
  return randomParagraph;
};

// Save typing result (with server-side recomputation and anti-cheat validation)
const saveResult = async ({ userId, typedText, timeTaken, errors, errorCount, paragraph }) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ValidationError('Invalid or missing user ID');
  }

  const finalErrors = typeof errorCount === 'number' ? errorCount : errors;

  if (typeof typedText !== 'string' || typeof timeTaken !== 'number' || typeof finalErrors !== 'number') {
    throw new ValidationError('Invalid request data');
  }

  const computedAccuracy = calculateAccuracy(typedText.length, finalErrors);

  // Anti-cheat & Net WPM safeguards:
  // 1. Minimum test duration: tests under 3 seconds cannot legitimately complete.
  // 2. Mash-and-paste safeguard: tests under 10 seconds with < 50% accuracy are zeroed out.
  let computedWpm = 0;
  const isTooFast = timeTaken < 3;
  const isMashed = timeTaken < 10 && computedAccuracy < 50;

  if (!isTooFast && !isMashed && timeTaken > 0) {
    const correctChars = Math.max(0, typedText.length - finalErrors);
    const netWords = correctChars / 5;
    const minutes = timeTaken / 60;
    computedWpm = Math.max(0, Math.round(netWords / minutes));
  }

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

  // Only update Redis Sorted Set leaderboard if test was valid, not spammed, and computedWpm > 0
  if (!isTooFast && !isMashed && computedWpm > 0) {
    try {
      const user = await User.findById(userId).select('username').lean();
      if (user && user.username) {
        await cacheService.zAdd('leaderboard:global', computedWpm, `${userId}:${user.username}`);
      }
    } catch (err) {
      console.warn(`Could not update Redis sorted set for user ${userId}:`, err.message);
    }
  }

  return result;
};

// Get user stats using aggregation
const getUserStats = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ValidationError('Invalid or missing user ID');
  }

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
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ValidationError('Invalid or missing user ID');
  }

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
