const rateLimit = require('express-rate-limit');

// Bypass limiters if running in test environment
const isTest = process.env.NODE_ENV === 'test';

// Limit registration attempts: 5 attempts per 15 minutes
const registerLimiter = isTest ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    message: 'Too many registration attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});

// Limit login attempts: 10 attempts per 15 minutes
const loginLimiter = isTest ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit typing result submissions to mitigate automated spam and fake results
const typingResultLimiter = isTest ? (req, res, next) => next() : rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // max 20 tests saved every 5 minutes
  message: {
    message: 'Too many typing test submissions. Please wait a few minutes before submitting another test.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  registerLimiter,
  loginLimiter,
  typingResultLimiter
};
