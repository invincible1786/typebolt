const authService = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const result = await authService.register({ username, email, password });
    res.status(201).json({
      message: 'User registered successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json({
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login
};
