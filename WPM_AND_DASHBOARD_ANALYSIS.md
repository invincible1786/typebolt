# TypeBolt: Technical Architecture & WPM Calculation Analysis

This document details the root cause of the timer freezing issue, how live and final WPM are computed, how skill tiers are assigned, how the dashboard aggregates telemetry, and how all errors were resolved and verified.

---

## 1. Root Cause: Why Did the Timer Stop While Typing?

### The Defect
When a user began typing in the typing arena, the countdown timer at the top right stopped updating (froze at `01:00`), the live WPM exploded into thousands (e.g. `2148 WPM`), and upon test completion the duration displayed `00:01`.

### The Mechanism
In React, `frontend/src/pages/TypingTest.jsx` previously had a `useEffect` managing the 1-second countdown interval with the following dependency array:

```javascript
// BROKEN PATTERN:
useEffect(() => {
  if (isTestActive && timeLeft > 0) {
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
  }
  return () => clearInterval(intervalRef.current);
}, [isTestActive, timeLeft, selectedDuration, currentIndex, errors.length, completeTest]);
```

1. **Every Keystroke Triggers Re-render**: Every keypress updates `currentIndex` (and possibly `errors`).
2. **Interval Perpetual Teardown**: Because `currentIndex` was in the `useEffect` dependency array, every single keystroke immediately triggered the cleanup function `clearInterval(intervalRef.current)` and re-created the 1000ms timer.
3. **Timer Starvation**: Typists type multiple keys per second (typically 1 key every 150–350ms). Since another key was always pressed before 1000ms elapsed, the interval callback **never fired**.
4. **Frozen Time Left**: `timeLeft` remained stuck at `selectedDuration` (60 seconds).
5. **Elapsed Time Fixed at 1s**: In the live telemetry calculation:
   ```javascript
   const elapsed = Math.max(1, selectedDuration - timeLeft); // 60 - 60 = 0 -> clamped to 1
   ```
   `elapsed` was permanently locked at `1 second`.
6. **WPM Explosion**: Typing 50 characters in 10 seconds divided `(50 / 5) = 10 words` by `1 / 60 min` = **600 WPM**. Typing 179 characters resulted in `(179 / 5) / (1 / 60)` = **2,148 WPM**.

---

## 2. The Solution: Decoupled Wall-Clock Timing

To eliminate timer freezing and drift completely:

1. **Decoupled Interval Effect**: The timer `useEffect` now depends strictly on `[isTestActive, selectedDuration, completeTest]`. Keystroke events never re-trigger or cancel the interval.
2. **Wall-Clock High-Precision Timestamps (`startTimeRef`)**:
   When the test starts, `startTimeRef.current = Date.now()` records the start epoch. Every tick calculates:
   ```javascript
   const elapsedSec = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
   const remaining = Math.max(0, selectedDuration - elapsedSec);
   setTimeLeft(remaining);
   ```
   Even if the browser experiences micro-stutters or background throttling, the timer will never drift or freeze.
3. **State Synchronization via `latestStateRef`**:
   To avoid stale closures in stable callbacks (`completeTest`), `latestStateRef.current` maintains synchronous access to `currentIndex`, `errors`, `paragraph`, and `typedText`.

---

## 3. How WPM Is Calculated (Net vs. Gross)

Standard typing competitions (e.g., TypeRacer, MonkeyType) measure **Net Words Per Minute (Net WPM)**, not Gross WPM. Standard typography conventions define **1 word = 5 characters (including spaces and punctuation)**.

### Net WPM Formula
$$\text{Net WPM} = \max\left(0, \frac{(\text{Characters Typed} - \text{Errors}) / 5}{\text{Time in Minutes}}\right)$$

Implementation in `frontend/src/utils/typingUtils.js`:
```javascript
export const calculateNetWPM = (typedCharacters, errors, timeInSeconds) => {
  if (!timeInSeconds || timeInSeconds < 2 || !typedCharacters || typedCharacters <= 0) return 0;
  const minutes = timeInSeconds / 60;
  const safeErrors = Math.max(0, errors || 0);
  const correctCharacters = Math.max(0, typedCharacters - safeErrors);
  const standardWords = correctCharacters / 5;
  return Math.max(0, Math.round(standardWords / minutes));
};
```

### Gross (Raw) WPM Formula
$$\text{Gross WPM} = \frac{\text{Characters Typed} / 5}{\text{Time in Minutes}}$$

### Accuracy Formula
$$\text{Accuracy (\%)} = \max\left(0, \frac{\text{Characters Typed} - \text{Errors}}{\text{Characters Typed}} \times 100\right)$$

---

## 4. Skill Tier Assignment (Accuracy-Gated)

Previously, any test reaching high speed was labeled "Master" regardless of error rate (even with 4% accuracy). Skill tiers now enforce **accuracy gates**:

| Tier | Required Net WPM | Required Accuracy | Description |
| :--- | :--- | :--- | :--- |
| **Unranked** | Any | `< 75%` | Fails minimum accuracy threshold; disqualifies mash spam |
| **Beginner** | `< 25 WPM` | `≥ 75%` | Novice typist building muscle memory |
| **Intermediate** | `25 - 44 WPM` | `≥ 75%` | Standard everyday typing speed |
| **Advanced** | `45 - 69 WPM` | `≥ 90%` | Fluent typist; requires ≥90% accuracy (capped at Intermediate if <90%) |
| **Expert** | `70 - 89 WPM` | `≥ 94%` | High-speed typist; requires ≥94% accuracy |
| **Master** | `≥ 90 WPM` | `≥ 96%` | Elite competitive tier; requires both ≥90 WPM and ≥96% accuracy |

Implementation in `frontend/src/utils/typingUtils.js`:
```javascript
export const getSpeedTier = (wpm = 0, accuracy = 100) => {
  const safeWpm = Math.max(0, wpm || 0);
  const safeAccuracy = typeof accuracy === 'number' ? accuracy : 100;

  if (safeAccuracy < 75) {
    return { name: 'Unranked', tier: 'unranked', color: '#ef4444' };
  }
  if (safeWpm < 25) return { name: 'Beginner', tier: 'beginner', color: '#94a3b8' };
  if (safeWpm < 45) return { name: 'Intermediate', tier: 'intermediate', color: '#38bdf8' };
  if (safeWpm < 70) {
    if (safeAccuracy < 90) return { name: 'Intermediate', tier: 'intermediate', color: '#38bdf8' };
    return { name: 'Advanced', tier: 'advanced', color: '#10b981' };
  }
  if (safeWpm < 90) {
    if (safeAccuracy < 94) return { name: 'Advanced', tier: 'advanced', color: '#10b981' };
    return { name: 'Expert', tier: 'expert', color: '#f59e0b' };
  }
  if (safeAccuracy >= 96) return { name: 'Master', tier: 'master', color: '#a855f7' };
  return { name: 'Expert', tier: 'expert', color: '#f59e0b' };
};
```

---

## 5. Backend Anti-Cheat & Server Verification

In `backend/services/typingService.js`, client-submitted results are never blindly trusted:

1. **Minimum Duration Enforcement**: Tests under 3 seconds cannot legitimately complete a challenge. WPM is set to `0`.
2. **Mash-and-Paste Safeguard**: Tests completed in `< 10 seconds` with `< 50%` accuracy are marked invalid (`WPM = 0`).
3. **Server-Side Recomputation**: The server recalculates Net WPM using `typedText.length`, verified `errors`, and `timeTaken`:
   ```javascript
   const correctChars = Math.max(0, typedText.length - finalErrors);
   const netWords = correctChars / 5;
   const minutes = timeTaken / 60;
   computedWpm = Math.max(0, Math.round(netWords / minutes));
   ```
4. **Leaderboard Filtering**: Only tests with `computedWpm > 0` passing anti-cheat checks are added to the Redis Sorted Set (`leaderboard:global`).

---

## 6. How Dashboard Data Is Loaded

The TypeBolt Dashboard (`frontend/src/pages/Dashboard.jsx`) aggregates analytics through parallel services:

```
[Dashboard Component Mount]
        │
        ├── Promise.allSettled:
        │   ├── GET /api/typing/stats       (User Aggregation & Averages)
        │   ├── GET /api/typing/history     (Recent Test Attempts)
        │   └── GET /api/typing/leaderboard (Global Top 10 via Redis)
```

1. **User Stats (`GET /api/typing/stats`)**:
   - Checks Redis cache (`stats:<userId>`).
   - If cache miss, executes a MongoDB aggregation pipeline computing `avgWpm`, `avgAccuracy`, `bestWpm`, and `totalTests`.
   - Caches result with a 5-minute TTL.
2. **Test History (`GET /api/typing/history`)**:
   - Queries `TypingResult` collection for the authenticated user, sorted by `createdAt: -1`, limited to the last 20 tests.
3. **Global Leaderboard (`GET /api/typing/leaderboard`)**:
   - Queries Redis Sorted Set `leaderboard:global` using `ZREVRANGEBYSCORE` for `O(log(N) + M)` instant ranking retrieval.
4. **Resilience Pattern (`Promise.allSettled`)**:
   - If any single service (e.g. leaderboard Redis temporary blip) fails, the remaining panels (user stats, history) continue to render without crashing the dashboard.
5. **Session Expiry Handling**:
   - Axios response interceptor in `frontend/src/utils/api.js` automatically catches `401 / 403` responses, clears local storage tokens, and redirects gracefully to `/login`.

---

## 7. Verification & Test Results

- **Backend Unit & Integration Tests**: `25 / 25` passing (`npm test` via Jest).
- **Frontend Engine & Component Tests**: `18 / 18` passing (`npm test` via React Testing Library).
- **Production Bundle**: Built cleanly with Vite (`vite build`).
- **Live In-Browser Verification**:
  - Timer observed counting down continuously: `01:00 -> 00:56 -> 00:50 -> 00:12 -> 00:08`.
  - Keystrokes smoothly registered without resetting the interval.
  - Live HUD reported `35 WPM` and final Net Speed reported `34 WPM` (realistic speed, no 2000+ explosion).
