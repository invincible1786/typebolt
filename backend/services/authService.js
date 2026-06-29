const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ConflictError, UnauthorizedError } = require('../utils/customErrors');

const register = async ({ username, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('User already exists');
  }

  const saltRounds = process.env.NODE_ENV === 'test' ? 1 : 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const newUser = new User({ username, email, password: hashedPassword });
  await newUser.save();

  const token = jwt.sign(
    { userId: newUser._id, email: newUser.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email
    }
  };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email
    }
  };
};

module.exports = {
  register,
  login
};
