// Calculate Net Words Per Minute (WPM) accounting for errors: ((characters - errors) / 5) / minutes
export const calculateNetWPM = (typedCharacters, errors, timeInSeconds) => {
  if (!timeInSeconds || timeInSeconds < 2 || !typedCharacters || typedCharacters <= 0) return 0;
  const minutes = timeInSeconds / 60;
  const safeErrors = Math.max(0, errors || 0);
  const correctCharacters = Math.max(0, typedCharacters - safeErrors);
  const standardWords = correctCharacters / 5;
  return Math.max(0, Math.round(standardWords / minutes));
};

// Calculate Gross (Raw) Words Per Minute (WPM): (characters / 5) / minutes
export const calculateGrossWPM = (typedCharacters, timeInSeconds) => {
  if (!timeInSeconds || timeInSeconds <= 0 || !typedCharacters || typedCharacters <= 0) return 0;
  const minutes = timeInSeconds / 60;
  const standardWords = typedCharacters / 5;
  return Math.max(0, Math.round(standardWords / minutes));
};

// Backwards-compatible alias for calculateGrossWPM
export const calculateWPM = (typedCharacters, timeInSeconds) => {
  return calculateGrossWPM(typedCharacters, timeInSeconds);
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

// Get typing speed tier details with accuracy gating, colors, and badge styling
export const getSpeedTier = (wpm = 0, accuracy = 100) => {
  const safeWpm = Math.max(0, wpm || 0);
  const safeAccuracy = typeof accuracy === 'number' ? accuracy : 100;

  // Accuracy below 75% immediately disqualifies from competitive speed tiers
  if (safeAccuracy < 75) {
    return {
      name: 'Unranked',
      tier: 'unranked',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      icon: '⚠️'
    };
  }

  if (safeWpm < 25) {
    return { name: 'Beginner', tier: 'beginner', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', icon: '🌱' };
  }
  if (safeWpm < 45) {
    return { name: 'Intermediate', tier: 'intermediate', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', icon: '⚡' };
  }
  if (safeWpm < 70) {
    // Requires accuracy >= 90% to count as Advanced, else capped at Intermediate
    if (safeAccuracy < 90) {
      return { name: 'Intermediate', tier: 'intermediate', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', icon: '⚡' };
    }
    return { name: 'Advanced', tier: 'advanced', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: '🚀' };
  }
  if (safeWpm < 90) {
    // Requires accuracy >= 94% to count as Expert, else capped at Advanced
    if (safeAccuracy < 94) {
      return { name: 'Advanced', tier: 'advanced', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: '🚀' };
    }
    return { name: 'Expert', tier: 'expert', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: '🔥' };
  }

  // Master tier requires wpm >= 90 AND accuracy >= 96%; otherwise falls back to Expert
  if (safeAccuracy >= 96) {
    return { name: 'Master', tier: 'master', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', icon: '👑' };
  }
  return { name: 'Expert', tier: 'expert', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: '🔥' };
};

// Get typing speed category name
export const getSpeedCategory = (wpm, accuracy = 100) => {
  return getSpeedTier(wpm, accuracy).name;
};
