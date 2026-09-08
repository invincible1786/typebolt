import {
  calculateNetWPM,
  calculateGrossWPM,
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
  describe('calculateNetWPM', () => {
    test('calculates Net WPM deducting errors: ((chars - errors) / 5) / minutes', () => {
      // 50 characters, 0 errors, 60s = 10 Net WPM
      expect(calculateNetWPM(50, 0, 60)).toBe(10);
      // 100 characters, 10 errors, 30s = (90 / 5) / 0.5 = 36 Net WPM
      expect(calculateNetWPM(100, 10, 30)).toBe(36);
      // 250 characters, 0 errors, 60s = 50 Net WPM
      expect(calculateNetWPM(250, 0, 60)).toBe(50);
    });

    test('returns 0 if elapsed time is less than 2 seconds', () => {
      // 179 characters, 171 errors, 1s -> 0 Net WPM (instant spam safeguard)
      expect(calculateNetWPM(179, 171, 1)).toBe(0);
      expect(calculateNetWPM(50, 0, 1)).toBe(0);
    });

    test('floors at 0 if errors exceed characters', () => {
      expect(calculateNetWPM(50, 60, 30)).toBe(0);
    });

    test('handles zero or negative duration and character count gracefully', () => {
      expect(calculateNetWPM(0, 0, 60)).toBe(0);
      expect(calculateNetWPM(100, 0, 0)).toBe(0);
      expect(calculateNetWPM(-10, 0, 60)).toBe(0);
      expect(calculateNetWPM(100, 0, -5)).toBe(0);
    });
  });

  describe('calculateGrossWPM and calculateWPM', () => {
    test('calculates Gross WPM accurately using standard 5 chars = 1 word formula', () => {
      expect(calculateGrossWPM(50, 60)).toBe(10);
      expect(calculateGrossWPM(100, 30)).toBe(40);
      expect(calculateGrossWPM(250, 60)).toBe(50);
      expect(calculateWPM(250, 60)).toBe(50);
    });

    test('handles zero or negative duration and character count gracefully', () => {
      expect(calculateGrossWPM(0, 60)).toBe(0);
      expect(calculateGrossWPM(100, 0)).toBe(0);
      expect(calculateGrossWPM(-10, 60)).toBe(0);
      expect(calculateGrossWPM(100, -5)).toBe(0);
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
    test('returns Unranked for accuracy below 75% regardless of WPM', () => {
      expect(getSpeedTier(2148, 4.47).tier).toBe('unranked');
      expect(getSpeedCategory(2148, 4.47)).toBe('Unranked');
      expect(getSpeedTier(120, 74.9).tier).toBe('unranked');
    });

    test('categorizes speed tiers with high accuracy', () => {
      expect(getSpeedCategory(15, 100)).toBe('Beginner');
      expect(getSpeedTier(15, 100).tier).toBe('beginner');

      expect(getSpeedCategory(35, 100)).toBe('Intermediate');
      expect(getSpeedTier(35, 100).tier).toBe('intermediate');

      expect(getSpeedCategory(55, 100)).toBe('Advanced');
      expect(getSpeedTier(55, 100).tier).toBe('advanced');

      expect(getSpeedCategory(80, 100)).toBe('Expert');
      expect(getSpeedTier(80, 100).tier).toBe('expert');

      // Master requires >= 90 WPM AND >= 96% accuracy
      expect(getSpeedCategory(110, 98)).toBe('Master');
      expect(getSpeedTier(110, 98).tier).toBe('master');
    });

    test('gates high tiers when accuracy is insufficient', () => {
      // 55 WPM with < 90% accuracy caps at Intermediate
      expect(getSpeedTier(55, 85).tier).toBe('intermediate');
      // 80 WPM with < 94% accuracy caps at Advanced
      expect(getSpeedTier(80, 91).tier).toBe('advanced');
      // 110 WPM with 93% accuracy falls back to Expert (not Master)
      expect(getSpeedTier(110, 93).tier).toBe('expert');
    });
  });
});
