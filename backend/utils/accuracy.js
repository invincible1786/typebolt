/**
 * Calculates typing accuracy percentage rounded to 2 decimal places.
 * @param {number} typedCharacters - Total characters typed.
 * @param {number} errors - Number of errors.
 * @returns {number} Accuracy percentage (0-100).
 */
const calculateAccuracy = (typedCharacters, errors) => {
  if (typeof typedCharacters !== 'number' || typeof errors !== 'number') {
    return 0;
  }
  if (typedCharacters <= 0) return 100;
  const accuracy = ((typedCharacters - errors) / typedCharacters) * 100;
  return Math.max(0, Math.round(accuracy * 100) / 100);
};

module.exports = { calculateAccuracy };
