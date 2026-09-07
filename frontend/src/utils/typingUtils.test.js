import {
  calculateWPM,
  calculateAccuracy,
  countWords,
  countCharacters,
  findErrors,
  formatTime,
  getSpeedCategory,
  getSpeedTier
} from './typingUtils';

describe('Typing Utilities Tests', () => {
  describe('calculateWPM', () => {
    test('calculates WPM accurately using standard 5 chars = 1 word formula', () => {
      // 50 characters in 60 seconds = 10 words / 1 min = 10 WPM
      expect(calculateWPM(50, 60)).toBe(10);
      // 100 characters in 30 seconds = 20 words / 0.5 min = 40 WPM
      expect(calculateWPM(100, 30)).toBe(40);
      // 250 characters in 60 seconds = 50 WPM
      expect(calculateWPM(250, 60)).toBe(50);
    });

    test('handles zero or negative duration and character count gracefully', () => {
      expect(calculateWPM(0, 60)).toBe(0);
      expect(calculateWPM(100, 0)).toBe(0);
      expect(calculateWPM(-10, 60)).toBe(0);
      expect(calculateWPM(100, -5)).toBe(0);
    });
  });

  describe('calculateAccuracy', () => {
    test('returns 100% when no errors are made', () => {
      expect(calculateAccuracy(100, 0)).toBe(100);
      expect(calculateAccuracy(0, 0)).toBe(100);
    });

    test('calculates rounded percentage for partial mistakes', () => {
      // 10 chars with 1 error = 90%
      expect(calculateAccuracy(10, 1)).toBe(90);
      // 20 chars with 2 errors = 90%
      expect(calculateAccuracy(20, 2)).toBe(90);
      // 30 chars with 1 error = 96.67%
      expect(calculateAccuracy(30, 1)).toBe(96.67);
    });

    test('does not return negative accuracy if errors exceed character count', () => {
      expect(calculateAccuracy(10, 20)).toBe(0);
    });
  });

  describe('findErrors', () => {
    test('returns 0 when typed matches original perfectly', () => {
      expect(findErrors('hello world', 'hello world')).toBe(0);
    });

    test('correctly counts mismatched characters', () => {
      expect(findErrors('hello', 'hexxo')).toBe(2);
      expect(findErrors('cat', 'dog')).toBe(3);
    });
  });

  describe('formatTime', () => {
    test('formats seconds to MM:SS string', () => {
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(15)).toBe('00:15');
      expect(formatTime(125)).toBe('02:05');
      expect(formatTime(0)).toBe('00:00');
    });
  });

  describe('getSpeedTier and getSpeedCategory', () => {
    test('categorizes speed tiers according to benchmarks', () => {
      expect(getSpeedCategory(15)).toBe('Beginner');
      expect(getSpeedTier(15).tier).toBe('beginner');

      expect(getSpeedCategory(35)).toBe('Intermediate');
      expect(getSpeedTier(35).tier).toBe('intermediate');

      expect(getSpeedCategory(55)).toBe('Advanced');
      expect(getSpeedTier(55).tier).toBe('advanced');

      expect(getSpeedCategory(80)).toBe('Expert');
      expect(getSpeedTier(80).tier).toBe('expert');

      expect(getSpeedCategory(110)).toBe('Master');
      expect(getSpeedTier(110).tier).toBe('master');
    });
  });
});
