const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const TypingResult = require('../models/TypingResult');

describe('Typing Endpoints', () => {
  let token;

  beforeAll(async () => {
    await User.init();
    await TypingResult.init();
  });

  beforeEach(async () => {
    // Register and login a user to get an auth token
    const registerPayload = {
      username: 'typinguser',
      email: 'typing@example.com',
      password: 'password123'
    };

    const regRes = await request(app)
      .post('/api/auth/register')
      .send(registerPayload);

    if (regRes.statusCode !== 201) {
      console.error('Registration failed in beforeEach:', regRes.statusCode, regRes.body);
    }

    token = regRes.body.token;
  });

  // 1. Get random paragraph -> succeeds (public endpoint)
  test('1. Get random paragraph -> succeeds', async () => {
    const res = await request(app)
      .get('/api/paragraph');

    expect(res.statusCode).toBe(200);
    expect(res.body.paragraph).toBeDefined();
    expect(typeof res.body.paragraph).toBe('string');
  });

  // 2. Save typing result fails without token -> fails (401)
  test('2. Save typing result fails without token -> 401', async () => {
    const res = await request(app)
      .post('/api/typing-result')
      .send({
        typedText: 'Test text',
        timeTaken: 10,
        errors: 0,
        paragraph: 'Test text'
      });

    expect(res.statusCode).toBe(401);
  });

  // 3. Save typing result fails with invalid token -> fails (403)
  test('3. Save typing result fails with invalid token -> 403', async () => {
    const res = await request(app)
      .post('/api/typing-result')
      .set('Authorization', 'Bearer invalidtokenhere')
      .send({
        typedText: 'Test text',
        timeTaken: 10,
        errors: 0,
        paragraph: 'Test text'
      });

    expect(res.statusCode).toBe(403);
  });

  // 4. Save typing result with valid data -> succeeds (201)
  test('4. Save typing result with valid data -> succeeds', async () => {
    const res = await request(app)
      .post('/api/typing-result')
      .set('Authorization', `Bearer ${token}`)
      .send({
        typedText: 'Test typing content on the server.',
        timeTaken: 15,
        errors: 1,
        paragraph: 'Test typing content on the server.'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Result saved successfully');
    expect(res.body.result).toBeDefined();
    expect(res.body.result.wpm).toBeDefined();
    expect(res.body.result.accuracy).toBeDefined();
  });

  // 5. Save typing result with invalid validation data -> fails (400)
  test('5. Save typing result with invalid validation data -> fails', async () => {
    const res = await request(app)
      .post('/api/typing-result')
      .set('Authorization', `Bearer ${token}`)
      .send({
        typedText: 123, // should be string
        timeTaken: 'ten', // should be number
        errors: 0
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 6. Get user stats -> returns correct statistics
  test('6. Get user stats -> returns correct statistics', async () => {
    // 0 stats first
    const statsRes1 = await request(app)
      .get('/api/user-stats')
      .set('Authorization', `Bearer ${token}`);
    
    expect(statsRes1.statusCode).toBe(200);
    expect(statsRes1.body.totalTests).toBe(0);

    // Save two results
    await request(app)
      .post('/api/typing-result')
      .set('Authorization', `Bearer ${token}`)
      .send({
        typedText: 'First test text.',
        timeTaken: 60, // 16 chars -> ~3.2 WPM
        errors: 0,
        paragraph: 'First test text.'
      });

    await request(app)
      .post('/api/typing-result')
      .set('Authorization', `Bearer ${token}`)
      .send({
        typedText: 'Second test text.',
        timeTaken: 60, // 17 chars -> ~3.4 WPM
        errors: 2,
        paragraph: 'Second test text.'
      });

    // Check stats again
    const statsRes2 = await request(app)
      .get('/api/user-stats')
      .set('Authorization', `Bearer ${token}`);

    expect(statsRes2.statusCode).toBe(200);
    expect(statsRes2.body.totalTests).toBe(2);
    expect(statsRes2.body.averageWpm).toBeDefined();
    expect(statsRes2.body.averageAccuracy).toBeDefined();
  });

  // 7. Get user history with default pagination -> succeeds
  test('7. Get user history with default pagination -> succeeds', async () => {
    const res = await request(app)
      .get('/api/typing-history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toBeDefined();
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  // 8. Get user history pagination query parameters -> works correctly
  test('8. Get user history pagination query parameters -> works correctly', async () => {
    // Save 3 results
    for (let i = 1; i <= 3; i++) {
      await request(app)
        .post('/api/typing-result')
        .set('Authorization', `Bearer ${token}`)
        .send({
          typedText: `Test result ${i}`,
          timeTaken: 10,
          errors: 0,
          paragraph: `Test result ${i}`
        });
    }

    // Request limit=2
    const res = await request(app)
      .get('/api/typing-history?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.results.length).toBe(2);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
    expect(res.body.totalPages).toBe(2);
  });

  // 9. Save typing result with errorCount -> succeeds
  test('9. Save typing result with errorCount -> succeeds', async () => {
    const res = await request(app)
      .post('/api/typing-result')
      .set('Authorization', `Bearer ${token}`)
      .send({
        typedText: 'Testing with explicit errorCount',
        timeTaken: 12,
        errorCount: 2,
        paragraph: 'Testing with explicit errorCount'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.result.errorCount).toBe(2);
    expect(res.body.result.errors).toBe(2);
  });

  // 10. Get global leaderboard -> succeeds and returns array
  test('10. Get global leaderboard -> succeeds', async () => {
    const res = await request(app)
      .get('/api/leaderboard');

    expect(res.statusCode).toBe(200);
    expect(res.body.leaderboard).toBeDefined();
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
  });

  // 11. Anti-cheat: timeTaken < 3 seconds recomputes WPM as 0
  test('11. Anti-cheat: timeTaken < 3 seconds recomputes WPM as 0', async () => {
    const res = await request(app)
      .post('/api/typing-result')
      .set('Authorization', `Bearer ${token}`)
      .send({
        typedText: 'Simplicity is prerequisite for reliability.',
        timeTaken: 1, // 1 second duration
        errors: 0,
        paragraph: 'Simplicity is prerequisite for reliability.'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.result.wpm).toBe(0);
  });

  // 12. Anti-cheat: mash-and-paste (<10s and <50% accuracy) recomputes WPM as 0
  test('12. Anti-cheat: mash-and-paste (<10s and <50% accuracy) recomputes WPM as 0', async () => {
    const res = await request(app)
      .post('/api/typing-result')
      .set('Authorization', `Bearer ${token}`)
      .send({
        typedText: 'Simplicity is prerequisite for reliability.',
        timeTaken: 2,
        errors: 40, // High errors, accuracy < 50%
        paragraph: 'Simplicity is prerequisite for reliability.'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.result.wpm).toBe(0);
  });
});
