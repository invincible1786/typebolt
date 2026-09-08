const typingService = require('../services/typingService');

const getRandomParagraph = async (req, res, next) => {
  try {
    const category = req.query.category;
    const paragraph = await typingService.getRandomParagraph(category);
    res.json({ paragraph });
  } catch (error) {
    next(error);
  }
};

const saveResult = async (req, res, next) => {
  try {
    const { typedText, timeTaken, errors, errorCount, paragraph } = req.body;
    const userId = req.user.userId;
    const finalErrors = errorCount !== undefined ? errorCount : errors;
    
    const result = await typingService.saveResult({
      userId,
      typedText,
      timeTaken,
      errors: finalErrors,
      errorCount: finalErrors,
      paragraph
    });
    
    // Server-side audit log
    if (process.env.NODE_ENV !== 'test') {
      console.log(`Recomputed results server-side for user ${userId}: WPM=${result.wpm}, Accuracy=${result.accuracy}% (Client sent WPM=${req.body.wpm}, Accuracy=${req.body.accuracy}%)`);
    }

    res.status(201).json({ message: 'Result saved successfully', result });
  } catch (error) {
    next(error);
  }
};

const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const stats = await typingService.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

const getUserHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    
    const historyData = await typingService.getUserHistory({ userId, page, limit });
    
    res.json(historyData);
  } catch (error) {
    next(error);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const leaderboard = await typingService.getLeaderboard(limit);
    res.json({ leaderboard });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRandomParagraph,
  saveResult,
  getUserStats,
  getUserHistory,
  getLeaderboard
};
