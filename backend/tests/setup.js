const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;
jest.setTimeout(60000);

const getIsDbTest = () => {
  const testPath = expect.getState().testPath;
  if (!testPath) return true;
  const normalized = testPath.replace(/\\/g, '/');
  return !normalized.includes('utils.test.js');
};

beforeAll(async () => {
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_key_that_is_at_least_32_characters_long_for_validation_checks';
  process.env.PORT = '5001';

  if (getIsDbTest()) {
    // Try connecting to local MongoDB first for sub-second test execution
    const testUri = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/typebolt_test';
    try {
      await mongoose.connect(testUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 1500
      });
      process.env.MONGO_URI = testUri;
    } catch {
      // Fallback to in-memory server (used in CI / containerized environments)
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGO_URI = mongoUri;

      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
  }
});

afterAll(async () => {
  if (getIsDbTest()) {
    if (mongoose.connection.readyState !== 0) {
      // Clean up test database
      try {
        await mongoose.connection.dropDatabase();
      } catch {
        // ignore drop error
      }
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
});

beforeEach(async () => {
  if (getIsDbTest() && mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});
