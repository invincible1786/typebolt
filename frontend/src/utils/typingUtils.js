// Calculate Words Per Minute (WPM)
export const calculateWPM = (typedWords, timeInSeconds) => {
  if (timeInSeconds === 0) return 0;
  const minutes = timeInSeconds / 60;
  return Math.round(typedWords / minutes);
};

// Calculate accuracy percentage
export const calculateAccuracy = (typedCharacters, errors) => {
  if (typedCharacters === 0) return 100;
  const accuracy = ((typedCharacters - errors) / typedCharacters) * 100;
  return Math.round(accuracy * 100) / 100;
};

// Count words in text
export const countWords = (text) => {
  return text.trim().split(/\s+/).length;
};

// Count characters in text
export const countCharacters = (text) => {
  return text.length;
};

// Compare typed text with original text and find errors
export const findErrors = (original, typed) => {
  let errors = 0;
  const maxLength = Math.max(original.length, typed.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (original[i] !== typed[i]) {
      errors++;
    }
  }
  
  return errors;
};

// Format time in MM:SS format
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Get typing speed category
export const getSpeedCategory = (wpm) => {
  if (wpm < 20) return 'Beginner';
  if (wpm < 40) return 'Intermediate';
  if (wpm < 60) return 'Advanced';
  if (wpm < 80) return 'Expert';
  return 'Master';
}; 