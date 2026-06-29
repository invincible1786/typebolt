// Test calculateAccuracy function with various inputs
const { calculateAccuracy } = require('../utils/accuracy');

describe('10. calculateAccuracy Function Tests', () => {
  test('0 typed characters should return 100', () => {
    expect(calculateAccuracy(0, 0)).toBe(100);
    expect(calculateAccuracy(0, 5)).toBe(100);
  });

  test('0 errors should return 100', () => {
    expect(calculateAccuracy(10, 0)).toBe(100);
  });

  test('partial errors should return correct rounded accuracy', () => {
    expect(calculateAccuracy(10, 1)).toBe(90);
    expect(calculateAccuracy(3, 1)).toBe(66.67);
  });

  test('full errors should return 0', () => {
    expect(calculateAccuracy(10, 10)).toBe(0);
  });
});
