const express = require('express');
const authenticateToken = require('../middlewares/auth');
const { typingResultLimiter } = require('../middlewares/rateLimiter');
const typingController = require('../controllers/typingController');

const router = express.Router();

// Get random paragraph
router.get('/paragraph', typingController.getRandomParagraph);

// Save typing result (authenticated + rate limited)
router.post('/typing-result', authenticateToken, typingResultLimiter, typingController.saveResult);

// Get user's typing history
router.get('/typing-history', authenticateToken, typingController.getUserHistory);

// Get user stats
router.get('/user-stats', authenticateToken, typingController.getUserStats);

// Get global leaderboard (public endpoint)
router.get('/leaderboard', typingController.getLeaderboard);

module.exports = router;