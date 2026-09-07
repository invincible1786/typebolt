const mongoose = require('mongoose');

const typingResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wpm: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  errorCount: { type: Number, required: true },
  timeTaken: { type: Number, required: true },
  paragraph: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for backwards compatibility with any existing queries or frontend callers
typingResultSchema.virtual('errors')
  .get(function() {
    return this.errorCount;
  })
  .set(function(value) {
    this.errorCount = value;
  });

// Compound index on user and timestamp for user history queries
typingResultSchema.index({ user: 1, timestamp: -1 });

// Compound index on wpm and timestamp for global leaderboard queries
typingResultSchema.index({ wpm: -1, timestamp: -1 });

module.exports = mongoose.model('TypingResult', typingResultSchema); 