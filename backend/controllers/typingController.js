const typingService = require('../services/typingService');

const getRandomParagraph = async (req, res, next) => {
  try {
    const paragraph = await typingService.getRandomParagraph();
    res.json({ paragraph });
  } catch (error) {
    next(error);
  }
};

const saveResult = async (req, res, next) => {
  try {
    const { typedText, timeTaken, errors, paragraph } = req.body;
    const userId = req.user.userId;
    
    const result = await typingService.saveResult({ userId, typedText, timeTaken, errors, paragraph });
    
    // Optional debug log
    console.log(`Recomputed results server-side for user ${userId}: WPM=${result.wpm}, Accuracy=${result.accuracy}% (Client sent WPM=${req.body.wpm}, Accuracy=${req.body.accuracy}%)`);

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

module.exports = {
  getRandomParagraph,
  saveResult,
  getUserStats,
  getUserHistory
};
