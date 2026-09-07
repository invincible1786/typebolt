import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { typingAPI } from '../utils/api';
import { calculateWPM, calculateAccuracy, formatTime, getSpeedTier } from '../utils/typingUtils';
import './TypingTest.css';

const TIME_OPTIONS = [15, 30, 60, 120];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-custom-tooltip">
        <p className="tooltip-time">⏱️ Time: {label}s</p>
        <p className="tooltip-wpm" style={{ color: '#00ff88' }}>
          ⚡ WPM: <strong>{payload[0]?.value || 0}</strong>
        </p>
        {payload[1] && (
          <p className="tooltip-accuracy" style={{ color: '#38bdf8' }}>
            🎯 Accuracy: <strong>{payload[1]?.value || 0}%</strong>
          </p>
        )}
      </div>
    );
  }
  return null;
};

const TypingTest = () => {
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [paragraph, setParagraph] = useState('');
  const [typedText, setTypedText] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTestActive, setIsTestActive] = useState(false);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [results, setResults] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState([]);
  
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const telemetryRef = useRef([]);

  // Fetch paragraph on mount
  const fetchParagraph = useCallback(async () => {
    try {
      setLoading(true);
      const response = await typingAPI.getParagraph();
      setParagraph(response.data.paragraph);
      setError('');
    } catch (err) {
      setError('Failed to load paragraph. Please refresh or retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParagraph();
  }, [fetchParagraph]);

  const completeTest = useCallback(() => {
    setIsTestActive(false);
    setIsTestComplete(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const elapsedSeconds = Math.max(1, selectedDuration - timeLeft);
    const totalErrors = errors.length;
    // Standard typing calculation: chars/5 / minutes
    const wpm = calculateWPM(currentIndex, elapsedSeconds);
    const accuracy = calculateAccuracy(currentIndex, totalErrors);

    // Final timeline record
    const finalTimeline = [
      ...telemetryRef.current,
      { second: elapsedSeconds, wpm, accuracy }
    ];
    setTimelineData(finalTimeline);

    const testResults = {
      wpm,
      accuracy,
      errorCount: totalErrors,
      errors: totalErrors,
      timeTaken: elapsedSeconds,
      paragraph,
      typedText
    };

    setResults(testResults);

    // Save to backend with anti-cheat recomputation
    typingAPI.saveResult(testResults).catch((err) => {
      console.error('Failed to save results:', err);
    });
  }, [selectedDuration, timeLeft, errors.length, currentIndex, paragraph, typedText]);

  // Timer effect with second-by-second telemetry logging
  useEffect(() => {
    if (isTestActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            completeTest();
            return 0;
          }

          const elapsed = selectedDuration - (prev - 1);
          const currentWpm = calculateWPM(currentIndex, elapsed);
          const currentAccuracy = calculateAccuracy(currentIndex, errors.length);

          telemetryRef.current.push({
            second: elapsed,
            wpm: currentWpm,
            accuracy: currentAccuracy
          });

          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTestActive, timeLeft, selectedDuration, currentIndex, errors.length, completeTest]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isTestActive || isTestComplete) return;

      // Ignore modifiers or functional keys
      if (['Tab', 'CapsLock', 'Shift', 'Control', 'Alt', 'Meta', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(e.key)) {
        return;
      }
      
      e.preventDefault();
      
      if (e.key === 'Backspace') {
        if (currentIndex > 0) {
          const newIndex = currentIndex - 1;
          setCurrentIndex(newIndex);
          setTypedText(prev => prev.slice(0, -1));
          setErrors(prev => prev.filter(errIdx => errIdx !== newIndex));
        }
        return;
      }
      
      if (e.key.length === 1) {
        const isCorrect = e.key === paragraph[currentIndex];
        setTypedText(prev => prev + e.key);
        
        if (!isCorrect) {
          setErrors(prev => [...prev, currentIndex]);
        }
        
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        
        // Auto-complete if end of text reached
        if (nextIndex >= paragraph.length) {
          completeTest();
        }
      }
    };

    if (isTestActive) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isTestActive, currentIndex, paragraph, isTestComplete, completeTest]);

  const startTest = () => {
    setIsTestActive(true);
    setTypedText('');
    setTimeLeft(selectedDuration);
    setIsTestComplete(false);
    setResults(null);
    setCurrentIndex(0);
    setErrors([]);
    telemetryRef.current = [{ second: 0, wpm: 0, accuracy: 100 }];
    setTimelineData([]);
    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  const handleDurationChange = (dur) => {
    if (!isTestActive) {
      setSelectedDuration(dur);
      setTimeLeft(dur);
    }
  };

  const retrySameParagraph = () => {
    setIsTestActive(false);
    setIsTestComplete(false);
    setResults(null);
    setTypedText('');
    setTimeLeft(selectedDuration);
    setCurrentIndex(0);
    setErrors([]);
    telemetryRef.current = [];
    setTimelineData([]);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const nextNewParagraph = () => {
    retrySameParagraph();
    fetchParagraph();
  };

  const elapsed = Math.max(1, selectedDuration - timeLeft);
  const currentLiveWpm = isTestActive ? calculateWPM(currentIndex, elapsed) : 0;
  const currentLiveAccuracy = isTestActive ? calculateAccuracy(currentIndex, errors.length) : 100;

  const renderParagraph = () => {
    return paragraph.split('').map((char, index) => {
      let className = 'char';
      
      if (index < currentIndex) {
        if (errors.includes(index)) {
          className += ' error';
        } else {
          className += ' correct';
        }
      } else if (index === currentIndex) {
        className += ' current';
      }
      
      return (
        <span key={index} className={className}>
          {index === currentIndex && <span className="caret-cursor" />}
          {char === ' ' ? '\u00A0' : char}
        </span>
      );
    });
  };

  if (loading && !paragraph) {
    return (
      <div className="typing-test-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading typing challenge...</p>
        </div>
      </div>
    );
  }

  if (error && !paragraph) {
    return (
      <div className="typing-test-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchParagraph} className="btn btn-primary" style={{ maxWidth: 160, margin: '15px auto 0' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const speedTier = results ? getSpeedTier(results.wpm) : null;

  return (
    <div className="typing-test-container">
      {/* Test Header & Timer Modes */}
      <div className="test-header">
        <div className="header-left">
          <h1>Speed Typing Arena</h1>
          <p className="subtitle">Standardized anti-cheat telemetry • 5 chars = 1 word</p>
        </div>

        {/* Mode Selector Chips */}
        {!isTestActive && !isTestComplete && (
          <div className="mode-selector">
            <span className="mode-label">Time Mode:</span>
            <div className="mode-chips">
              {TIME_OPTIONS.map((dur) => (
                <button
                  key={dur}
                  className={`mode-chip ${selectedDuration === dur ? 'active' : ''}`}
                  onClick={() => handleDurationChange(dur)}
                >
                  ⚡ {dur}s
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="timer">
          <span className="timer-label">Time:</span>
          <span className={`timer-value ${timeLeft <= 10 && isTestActive ? 'warning' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Start Banner */}
      {!isTestActive && !isTestComplete && (
        <div className="test-start">
          <h2>Ready to test your speed?</h2>
          <p>Type the text below as fast and precisely as possible. The timer begins when you press Start.</p>
          <button onClick={startTest} className="btn btn-primary start-btn">
            Start Test ({selectedDuration}s) →
          </button>
        </div>
      )}

      {/* Typing Workspace */}
      <div className="test-content">
        <div
          className={`paragraph-display ${isTestActive ? 'active' : ''}`}
          ref={containerRef}
          tabIndex={0}
          onClick={() => {
            if (!isTestActive && !isTestComplete) {
              startTest();
            }
          }}
        >
          <div className="paragraph-text">
            {renderParagraph()}
          </div>
        </div>

        {/* Live In-Test Telemetry HUD */}
        {isTestActive && (
          <div className="test-stats">
            <div className="stat">
              <span className="stat-label">Progress</span>
              <span className="stat-value">
                {Math.round((currentIndex / paragraph.length) * 100)}%
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Errors</span>
              <span className="stat-value errors-value">{errors.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Live WPM</span>
              <span className="stat-value wpm-value">{currentLiveWpm}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Accuracy</span>
              <span className="stat-value">{currentLiveAccuracy}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Test Complete & Results + Performance Graph */}
      {isTestComplete && results && (
        <div className="test-results">
          <div className="results-header">
            <h2>Test Results & Telemetry</h2>
            {speedTier && (
              <div
                className="results-tier-badge"
                style={{ color: speedTier.color, backgroundColor: speedTier.bg }}
              >
                {speedTier.icon} {speedTier.name} Tier
              </div>
            )}
          </div>

          <div className="results-grid">
            <div className="result-card highlight">
              <h3>Net WPM</h3>
              <div className="result-value">{results.wpm}</div>
              <div className="result-category">Industry Standard Formula</div>
            </div>
            <div className="result-card">
              <h3>Accuracy</h3>
              <div className="result-value">{results.accuracy}%</div>
              <div className="result-category">Keystroke Precision</div>
            </div>
            <div className="result-card">
              <h3>Errors</h3>
              <div className="result-value error-value">{results.errorCount ?? results.errors}</div>
              <div className="result-category">Mistyped Characters</div>
            </div>
            <div className="result-card">
              <h3>Time</h3>
              <div className="result-value">{formatTime(results.timeTaken)}</div>
              <div className="result-category">Duration</div>
            </div>
          </div>

          {/* Recharts Live Speed Progression Graph */}
          {timelineData.length > 1 && (
            <div className="chart-section">
              <div className="chart-header">
                <h3>📈 WPM & Accuracy Telemetry</h3>
                <span className="chart-legend">
                  <span className="legend-item"><span className="legend-dot green"></span> Speed (WPM)</span>
                  <span className="legend-item"><span className="legend-dot cyan"></span> Accuracy (%)</span>
                </span>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={timelineData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00ff88" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00ff88" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="second"
                      stroke="#666"
                      tick={{ fill: '#888', fontSize: 12 }}
                      unit="s"
                    />
                    <YAxis
                      stroke="#666"
                      tick={{ fill: '#888', fontSize: 12 }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="wpm"
                      stroke="#00ff88"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorWpm)"
                    />
                    <Area
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#colorAcc)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Action Buttons: Retry Same, New Paragraph, Dashboard */}
          <div className="results-actions">
            <button onClick={retrySameParagraph} className="btn btn-secondary">
              🔄 Retry Same Text
            </button>
            <button onClick={nextNewParagraph} className="btn btn-primary">
              ✨ New Paragraph
            </button>
            <Link to="/dashboard" className="btn btn-secondary dashboard-link-btn">
              📊 View Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingTest; 