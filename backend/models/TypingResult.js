const mongoose = require('mongoose');

const typingResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wpm: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  errors: { type: Number, required: true },
  timeTaken: { type: Number, required: true },
  paragraph: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Add compound index on user and timestamp
typingResultSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('TypingResult', typingResultSchema); 