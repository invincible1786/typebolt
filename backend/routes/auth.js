const express = require('express');
const { registerSchema, loginSchema, validate } = require('../validators/authValidators');
const { registerLimiter, loginLimiter } = require('../middlewares/rateLimiter');
const authController = require('../controllers/authController');

const router = express.Router();

// Register
router.post('/register', registerLimiter, validate(registerSchema), authController.register);

// Login
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

module.exports = router;