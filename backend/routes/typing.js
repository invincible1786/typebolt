const express = require('express');
const authenticateToken = require('../middlewares/auth');
const typingController = require('../controllers/typingController');

const router = express.Router();

// Get random paragraph
router.get('/paragraph', typingController.getRandomParagraph);

// Save typing result
router.post('/typing-result', authenticateToken, typingController.saveResult);

// Get user's typing history
router.get('/typing-history', authenticateToken, typingController.getUserHistory);

// Get user stats
router.get('/user-stats', authenticateToken, typingController.getUserStats);

module.exports = router;