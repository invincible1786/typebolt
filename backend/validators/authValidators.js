const { z } = require('zod');

// Registration schema: email, username (3-20 chars, alphanumeric), password (min 6 chars)
const registerSchema = z.object({
  username: z.string()
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(20, { message: 'Username must not exceed 20 characters' })
    .regex(/^[a-zA-Z0-9]+$/, { message: 'Username must be alphanumeric' }),
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' })
});

// Login schema: email, password (non-empty)
const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' })
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerSchema,
  loginSchema,
  validate
};
