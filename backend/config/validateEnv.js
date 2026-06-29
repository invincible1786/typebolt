const { z } = require('zod');

const envSchema = z.object({
  MONGO_URI: z.string({
    required_error: 'MONGO_URI is required'
  }).min(1, { message: 'MONGO_URI cannot be empty' }),
  
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required'
  }).min(32, { message: 'JWT_SECRET must be at least 32 characters long' }),
  
  PORT: z.string().optional().default('5000'),
  
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development')
});

function validateEnv() {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    if (error.name === 'ZodError') {
      console.error('\n❌ Environment Variable Validation Failed:');
      error.issues.forEach(issue => {
        console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
      });
      console.error('\nPlease configure your .env file correctly and restart the server.\n');
      process.exit(1);
      return;
    }
    throw error;
  }
}

module.exports = validateEnv;
