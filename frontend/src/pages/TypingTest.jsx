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
import {
  Clock,
  RotateCcw,  
  Sparkles,
  BarChart2,
  Activity,
  Code2,
  BookOpen,
  Hash
} from 'lucide-react';
import { typingAPI } from '../utils/api';
import { calculateNetWPM, calculateGrossWPM, calculateAccuracy, formatTime, getSpeedTier } from '../utils/typingUtils';
import './TypingTest.css';

const TIME_OPTIONS = [15, 30, 60, 120];

const CATEGORY_OPTIONS = [
  { id: 'prose', label: 'Prose', icon: BookOpen },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'punctuation', label: 'Punctuation', icon: Hash }
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-custom-tooltip">
        <p className="tooltip-time">Time: {label}s</p>
        <p className="tooltip-wpm" style={{ color: 'var(--accent-primary)' }}>
          WPM: <strong>{payload[0]?.value || 0}</strong>
        </p>
        {payload[1] && (
          <p className="tooltip-accuracy" style={{ color: '#38bdf8' }}>
            Accuracy: <strong>{payload[1]?.value || 0}%</strong>
          </p>
        )}
      </div>
    );
  }
  return null;
};

const TypingTest = () => {
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [selectedCategory, setSelectedCategory] = useState('prose');
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
  const startTimeRef = useRef(null);
  const latestStateRef = useRef({
    currentIndex: 0,
    errors: [],
    selectedDuration: 60,
    paragraph: '',
    typedText: ''
  });

  // Keep latestStateRef in sync with React state
  useEffect(() => {
    latestStateRef.current = {
      currentIndex,
      errors,
      selectedDuration,
      paragraph,
      typedText
    };
  }, [currentIndex, errors, selectedDuration, paragraph, typedText]);

  // Fetch paragraph with selected category
  const fetchParagraph = useCallback(async (cat = selectedCategory) => {
    try {
      setLoading(true);
      const response = await typingAPI.getParagraph(cat);
      setParagraph(response.data.paragraph);
      setError('');
    } catch (err) {
      setError('Failed to load challenge. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchParagraph(selectedCategory);
  }, [fetchParagraph, selectedCategory]);

  // Stable completeTest callback decoupled from component re-renders
  const completeTest = useCallback(() => {
    setIsTestActive(false);
    setIsTestComplete(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const now = Date.now();
    const start = startTimeRef.current || now;
    const actualElapsed = Math.max(1, Math.round((now - start) / 1000));
    const {
      currentIndex: currIdx,
      errors: errList,
      selectedDuration: dur,
      paragraph: para,
      typedText: typed
    } = latestStateRef.current;

    // Elapsed seconds is clamped to selectedDuration for standard timer tests
    const elapsedSeconds = Math.min(actualElapsed, dur);
    const totalErrors = errList.length;

    // Standard Net typing calculation: ((characters - errors) / 5) / minutes
    const netWpm = calculateNetWPM(currIdx, totalErrors, elapsedSeconds);
    const rawWpm = calculateGrossWPM(currIdx, elapsedSeconds);
    const accuracy = calculateAccuracy(currIdx, totalErrors);

    const finalTimeline = [
      ...telemetryRef.current,
      { second: elapsedSeconds, wpm: netWpm, rawWpm, accuracy }
    ];
    setTimelineData(finalTimeline);

    const testResults = {
      wpm: netWpm,
      rawWpm,
      accuracy,
      errorCount: totalErrors,
      errors: totalErrors,
      timeTaken: elapsedSeconds,
      paragraph: para,
      typedText: typed
    };

    setResults(testResults);

    // Save to backend with anti-cheat recomputation and sync server-verified values
    typingAPI.saveResult(testResults).then((response) => {
      if (response.data && response.data.result) {
        setResults(prev => ({
          ...prev,
          wpm: response.data.result.wpm,
          accuracy: response.data.result.accuracy,
          errorCount: response.data.result.errorCount,
          timeTaken: response.data.result.timeTaken
        }));
      }
    }).catch((err) => {
      console.error('Failed to save results:', err);
    });
  }, []);

  // Timer effect: completely decoupled from keystroke re-renders
  // Uses wall-clock delta (Date.now() - startTimeRef.current) so interval drift/delays never corrupt timing
  useEffect(() => {
    if (!isTestActive) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const start = startTimeRef.current || now;
      const elapsedSec = Math.max(1, Math.floor((now - start) / 1000));
      const remaining = Math.max(0, selectedDuration - elapsedSec);

      setTimeLeft(remaining);

      const { currentIndex: currIdx, errors: errList } = latestStateRef.current;
      const currentNetWpm = calculateNetWPM(currIdx, errList.length, elapsedSec);
      const currentGrossWpm = calculateGrossWPM(currIdx, elapsedSec);
      const currentAccuracy = calculateAccuracy(currIdx, errList.length);

      telemetryRef.current.push({
        second: elapsedSec,
        wpm: currentNetWpm,
        rawWpm: currentGrossWpm,
        accuracy: currentAccuracy
      });

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        completeTest();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTestActive, selectedDuration, completeTest]);

  const startTest = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsTestActive(true);
    setTypedText('');
    setTimeLeft(selectedDuration);
    setIsTestComplete(false);
    setResults(null);
    setCurrentIndex(0);
    setErrors([]);
    telemetryRef.current = [{ second: 0, wpm: 0, accuracy: 100 }];
    setTimelineData([]);
    latestStateRef.current = {
      currentIndex: 0,
      errors: [],
      selectedDuration,
      paragraph,
      typedText: ''
    };
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, [selectedDuration, paragraph]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Auto-start test if typing starts before clicking the start button
      if (!isTestActive && !isTestComplete && paragraph && !loading) {
        if (
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          e.key !== 'Tab' &&
          e.key !== 'Enter'
        ) {
          e.preventDefault();
          startTest();

          const isCorrect = e.key === paragraph[0];
          const newErrors = isCorrect ? [] : [0];
          setTypedText(e.key);
          if (!isCorrect) {
            setErrors(newErrors);
          }
          setCurrentIndex(1);
          latestStateRef.current.currentIndex = 1;
          latestStateRef.current.typedText = e.key;
          latestStateRef.current.errors = newErrors;
          return;
        }
        return;
      }

      if (!isTestActive || isTestComplete) return;

      // Ignore modifier or functional keys
      if (['Tab', 'CapsLock', 'Shift', 'Control', 'Alt', 'Meta', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(e.key)) {
        return;
      }

      e.preventDefault();

      if (e.key === 'Backspace') {
        if (currentIndex > 0) {
          const newIndex = currentIndex - 1;
          const newTyped = typedText.slice(0, -1);
          const newErrors = errors.filter(errIdx => errIdx !== newIndex);

          setCurrentIndex(newIndex);
          setTypedText(newTyped);
          setErrors(newErrors);

          latestStateRef.current.currentIndex = newIndex;
          latestStateRef.current.typedText = newTyped;
          latestStateRef.current.errors = newErrors;
        }
        return;
      }

      if (e.key.length === 1) {
        const isCorrect = e.key === paragraph[currentIndex];
        const newTyped = typedText + e.key;
        const newErrors = isCorrect ? errors : [...errors, currentIndex];
        const nextIndex = currentIndex + 1;

        setTypedText(newTyped);
        if (!isCorrect) {
          setErrors(newErrors);
        }
        setCurrentIndex(nextIndex);

        latestStateRef.current.currentIndex = nextIndex;
        latestStateRef.current.typedText = newTyped;
        latestStateRef.current.errors = newErrors;

        // Auto-complete if end of text reached
        if (nextIndex >= paragraph.length) {
          completeTest();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isTestActive, isTestComplete, paragraph, loading, currentIndex, errors, typedText, startTest, completeTest]);

  const handleDurationChange = (dur) => {
    if (!isTestActive) {
      setSelectedDuration(dur);
      setTimeLeft(dur);
      latestStateRef.current.selectedDuration = dur;
    }
  };

  const handleCategoryChange = (cat) => {
    if (!isTestActive) {
      setSelectedCategory(cat);
      fetchParagraph(cat);
      retrySameParagraph();
    }
  };

  const retrySameParagraph = () => {
    startTimeRef.current = null;
    setIsTestActive(false);
    setIsTestComplete(false);
    setResults(null);
    setTypedText('');
    setTimeLeft(selectedDuration);
    setCurrentIndex(0);
    setErrors([]);
    telemetryRef.current = [];
    setTimelineData([]);
    latestStateRef.current = {
      currentIndex: 0,
      errors: [],
      selectedDuration,
      paragraph,
      typedText: ''
    };
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const nextNewParagraph = () => {
    retrySameParagraph();
    fetchParagraph(selectedCategory);
  };

  const elapsedWallSeconds = isTestActive && startTimeRef.current
    ? Math.max(1, (Date.now() - startTimeRef.current) / 1000)
    : 1;
  const currentLiveWpm = isTestActive ? calculateNetWPM(currentIndex, errors.length, elapsedWallSeconds) : 0;
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
          <button onClick={() => fetchParagraph(selectedCategory)} className="btn btn-primary" style={{ maxWidth: 160, margin: '15px auto 0' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const speedTier = results ? getSpeedTier(results.wpm, results.accuracy) : null;

  return (
    <div className="typing-test-container">
      {/* Test Controls Header */}
      <div className="test-header">
        <div className="header-left">
          <h1>Typing Test</h1>
          <p className="subtitle">Standardized anti-cheat telemetry • 5 characters = 1 word</p>
        </div>

        {/* Mode Selector Chips */}
        {!isTestActive && !isTestComplete && (
          <div className="controls-row">
            {/* Category Selector */}
            <div className="selector-group">
              <span className="selector-label">Mode:</span>
              <div className="selector-chips">
                {CATEGORY_OPTIONS.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      className={`selector-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                      onClick={() => handleCategoryChange(cat.id)}
                    >
                      <Icon size={13} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Selector */}
            <div className="selector-group">
              <span className="selector-label">Time:</span>
              <div className="selector-chips">
                {TIME_OPTIONS.map((dur) => (
                  <button
                    key={dur}
                    className={`selector-chip ${selectedDuration === dur ? 'active' : ''}`}
                    onClick={() => handleDurationChange(dur)}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="timer-display">
          <Clock size={16} className="timer-icon" />
          <span className={`timer-value ${timeLeft <= 10 && isTestActive ? 'warning' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Start Prompt Banner */}
      {!isTestActive && !isTestComplete && (
        <div className="test-start">
          <div className="start-info">
            <h2>Ready to test your speed</h2>
            <p>Timer begins when you click Start or press any key inside the typing area.</p>
          </div>
          <button onClick={startTest} className="btn btn-primary start-btn">
            Start Test ({selectedDuration}s)
          </button>
        </div>
      )}

      {/* Typing Workspace */}
      <div className="test-content">
        <div
          className={`paragraph-display ${isTestActive ? 'active' : ''} ${selectedCategory === 'code' ? 'code-font' : ''}`}
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

      {/* Test Complete & Results Centerpiece */}
      {isTestComplete && results && (
        <div className="test-results">
          {/* Hero Section */}
          <div className="results-hero">
            <div className="hero-stat-box">
              <span className="hero-stat-label">Net Typing Speed</span>
              <div className="hero-stat-number">
                {results.wpm} <span className="hero-unit">WPM</span>
              </div>
              <span className="hero-stat-formula">Standard ((chars - errors) / 5) / min • Server Verified</span>
            </div>

            <div className="supporting-stats-grid">
              <div className="supporting-card">
                <span className="card-label">Accuracy</span>
                <span className="card-value">{results.accuracy}%</span>
              </div>
              <div className="supporting-card">
                <span className="card-label">Mistyped</span>
                <span className="card-value error-text">{results.errorCount ?? results.errors}</span>
              </div>
              <div className="supporting-card">
                <span className="card-label">Duration</span>
                <span className="card-value">{formatTime(results.timeTaken)}</span>
              </div>
              <div className="supporting-card">
                <span className="card-label">Skill Tier</span>
                <span className="card-value tier-name" style={{ color: speedTier.color }}>
                  {speedTier.name}
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Progression Telemetry */}
          {timelineData.length > 1 && (
            <div className="chart-section">
              <div className="chart-header">
                <div className="chart-title">
                  <Activity size={16} />
                  <span>Speed Progression & Consistency</span>
                </div>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-dot amber"></span> Speed (WPM)
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot sky"></span> Accuracy (%)
                  </span>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={timelineData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2433" />
                    <XAxis
                      dataKey="second"
                      stroke="#475569"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      unit="s"
                    />
                    <YAxis
                      stroke="#475569"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="wpm"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorWpm)"
                    />
                    <Area
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#colorAcc)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Action Loops */}
          <div className="results-actions">
            <button onClick={retrySameParagraph} className="btn btn-secondary">
              <RotateCcw size={15} />
              <span>Retry Same Text</span>
            </button>
            <button onClick={nextNewParagraph} className="btn btn-primary">
              <Sparkles size={15} />
              <span>Next Challenge</span>
            </button>
            <Link to="/dashboard" className="btn btn-secondary dashboard-link-btn">
              <BarChart2 size={15} />
              <span>View Dashboard</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingTest;
