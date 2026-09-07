// Calculate Words Per Minute (WPM) using the industry standard formula: (characters / 5) / minutes
export const calculateWPM = (typedCharacters, timeInSeconds) => {
  if (!timeInSeconds || timeInSeconds <= 0 || !typedCharacters || typedCharacters <= 0) return 0;
  const minutes = timeInSeconds / 60;
  const standardWords = typedCharacters / 5;
  return Math.round(standardWords / minutes);
};

// Calculate accuracy percentage
export const calculateAccuracy = (typedCharacters, errors) => {
  if (!typedCharacters || typedCharacters <= 0) return 100;
  const safeErrors = Math.max(0, errors || 0);
  const accuracy = ((typedCharacters - safeErrors) / typedCharacters) * 100;
  return Math.max(0, Math.round(accuracy * 100) / 100);
};

// Count words in text (for stats display or reference)
export const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

// Count characters in text
export const countCharacters = (text) => {
  return text ? text.length : 0;
};

// Compare typed text with original text and find errors
export const findErrors = (original, typed) => {
  if (!original || !typed) return 0;
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

// Get typing speed tier details with colors and badge iconography
export const getSpeedTier = (wpm = 0) => {
  if (wpm < 25) {
    return { name: 'Beginner', tier: 'beginner', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', icon: '🌱' };
  }
  if (wpm < 45) {
    return { name: 'Intermediate', tier: 'intermediate', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', icon: '⚡' };
  }
  if (wpm < 70) {
    return { name: 'Advanced', tier: 'advanced', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', icon: '🚀' };
  }
  if (wpm < 90) {
    return { name: 'Expert', tier: 'expert', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: '🔥' };
  }
  return { name: 'Master', tier: 'master', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', icon: '👑' };
};

// Get typing speed category name
export const getSpeedCategory = (wpm) => {
  return getSpeedTier(wpm).name;
}; 