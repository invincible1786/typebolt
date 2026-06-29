const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    await User.init();
  });

  const registerPayload = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  };

  // 1. Registration with valid data -> succeeds
  test('1. Registration with valid data -> succeeds', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(registerPayload);
      
    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe(registerPayload.username);
  });

  // 2. Registration with duplicate email -> fails
  test('2. Registration with duplicate email -> fails', async () => {
    // Register once
    await request(app)
      .post('/api/auth/register')
      .send(registerPayload);

    // Register again with same email but different username
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'anotheruser',
        email: registerPayload.email,
        password: 'password123'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT_ERROR');
    expect(res.body.error.message).toBe('User already exists');
  });

  // 3. Registration with duplicate username -> fails
  test('3. Registration with duplicate username -> fails', async () => {
    // Register once
    await request(app)
      .post('/api/auth/register')
      .send(registerPayload);

    // Register again with same username but different email
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: registerPayload.username,
        email: 'another@example.com',
        password: 'password123'
      });

    // Enforced by unique: true index. Mongodb-memory-server builds indexes.
    // Wait for Mongoose to sync indexes first, or let MongoDB validation catch it
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 4. Registration with invalid email -> fails (validation)
  test('4. Registration with invalid email -> fails (validation)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 5. Registration with weak password -> fails (validation)
  test('5. Registration with weak password -> fails (validation)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 6. Login with valid credentials -> returns token
  test('6. Login with valid credentials -> returns token', async () => {
    // Register
    await request(app)
      .post('/api/auth/register')
      .send(registerPayload);

    // Login
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: registerPayload.email,
        password: registerPayload.password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(registerPayload.email);
  });

  // 7. Login with wrong password -> fails
  test('7. Login with wrong password -> fails', async () => {
    // Register
    await request(app)
      .post('/api/auth/register')
      .send(registerPayload);

    // Login with wrong password
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: registerPayload.email,
        password: 'wrongpassword'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED_ERROR');
    expect(res.body.error.message).toBe('Invalid credentials');
  });

  // 8. Login with non-existent email -> fails
  test('8. Login with non-existent email -> fails', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'doesnotexist@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED_ERROR');
  });

  // 9. Login with missing fields -> fails (validation)
  test('9. Login with missing fields -> fails (validation)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
