import React, { useState, useEffect, useRef } from 'react';
import { typingAPI } from '../utils/api';
import { calculateWPM, calculateAccuracy, countWords, findErrors, formatTime, getSpeedCategory } from '../utils/typingUtils';
import './TypingTest.css';

const TypingTest = () => {
  const [paragraph, setParagraph] = useState('');
  const [typedText, setTypedText] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTestActive, setIsTestActive] = useState(false);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState([]);
  
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  // Fetch paragraph on component mount
  useEffect(() => {
    fetchParagraph();
  }, []);

  // Timer effect
  useEffect(() => {
    if (isTestActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            completeTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTestActive, timeLeft]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isTestActive || isTestComplete) return;
      
      e.preventDefault();
      
      if (e.key === 'Backspace') {
        if (currentIndex > 0) {
          const newIndex = currentIndex - 1;
          setCurrentIndex(newIndex);
          setTypedText(prev => prev.slice(0, -1));
          // Remove the error at the current position being deleted
          setErrors(prev => prev.filter(errorIndex => errorIndex !== newIndex));
        }
        return;
      }
      
      if (e.key.length === 1) {
        const isCorrect = e.key === paragraph[currentIndex];
        setTypedText(prev => prev + e.key);
        
        if (!isCorrect) {
          setErrors(prev => [...prev, currentIndex]);
        }
        
        setCurrentIndex(prev => prev + 1);
        
        // Check if test is complete
        if (currentIndex + 1 >= paragraph.length) {
          completeTest();
        }
      }
    };

    if (isTestActive) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isTestActive, currentIndex, paragraph, isTestComplete]);

  const fetchParagraph = async () => {
    try {
      setLoading(true);
      const response = await typingAPI.getParagraph();
      setParagraph(response.data.paragraph);
      setError('');
    } catch (err) {
      setError('Failed to load paragraph. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const startTest = () => {
    setIsTestActive(true);
    setTypedText('');
    setTimeLeft(60);
    setIsTestComplete(false);
    setResults(null);
    setCurrentIndex(0);
    setErrors([]);
    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  const completeTest = () => {
    setIsTestActive(false);
    setIsTestComplete(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Calculate results
    const typedWords = countWords(typedText);
    const totalErrors = errors.length;
    const wpm = calculateWPM(typedWords, 60 - timeLeft);
    const accuracy = calculateAccuracy(currentIndex, totalErrors);

    const testResults = {
      wpm,
      accuracy,
      errors: totalErrors,
      timeTaken: 60 - timeLeft,
      paragraph,
      typedText
    };

    setResults(testResults);
    saveResults(testResults);
  };

  const saveResults = async (testResults) => {
    try {
      await typingAPI.saveResult(testResults);
    } catch (err) {
      console.error('Failed to save results:', err);
    }
  };

  const resetTest = () => {
    setIsTestActive(false);
    setIsTestComplete(false);
    setResults(null);
    setTypedText('');
    setTimeLeft(60);
    setCurrentIndex(0);
    setErrors([]);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    fetchParagraph();
  };

  const renderParagraph = () => {
    return paragraph.split('').map((char, index) => {
      let className = 'char';
      
      if (index < currentIndex) {
        // Already typed
        if (errors.includes(index)) {
          className += ' error';
        } else {
          className += ' correct';
        }
      } else if (index === currentIndex) {
        // Current character
        className += ' current';
      }
      
      return (
        <span key={index} className={className}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      );
    });
  };

  if (loading) {
    return (
      <div className="typing-test-container">
        <div className="loading">Loading paragraph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="typing-test-container">
        <div className="error-message">{error}</div>
        <button onClick={fetchParagraph} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="typing-test-container">
      <div className="test-header">
        <h1>Speed Typing Test</h1>
        <div className="timer">
          <span className="timer-label">Time:</span>
          <span className={`timer-value ${timeLeft <= 10 ? 'warning' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {!isTestActive && !isTestComplete && (
        <div className="test-start">
          <p>Type the text below as quickly and accurately as possible.</p>
          <p>You have 60 seconds to complete the test.</p>
          <button onClick={startTest} className="btn btn-primary start-btn">
            Start Test
          </button>
        </div>
      )}

      <div className="test-content">
        <div className="paragraph-display" ref={containerRef} tabIndex={0}>
          <div className="paragraph-text">
            {renderParagraph()}
          </div>
        </div>

        {isTestActive && (
          <div className="test-stats">
            <div className="stat">
              <span className="stat-label">Progress:</span>
              <span className="stat-value">{Math.round((currentIndex / paragraph.length) * 100)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Errors:</span>
              <span className="stat-value">{errors.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">WPM:</span>
              <span className="stat-value">
                {calculateWPM(countWords(typedText), 60 - timeLeft)}
              </span>
            </div>
          </div>
        )}
      </div>

      {isTestComplete && results && (
        <div className="test-results">
          <h2>Test Complete!</h2>
          <div className="results-grid">
            <div className="result-card">
              <h3>WPM</h3>
              <div className="result-value">{results.wpm}</div>
              <div className="result-category">{getSpeedCategory(results.wpm)}</div>
            </div>
            <div className="result-card">
              <h3>Accuracy</h3>
              <div className="result-value">{results.accuracy}%</div>
            </div>
            <div className="result-card">
              <h3>Errors</h3>
              <div className="result-value">{results.errors}</div>
            </div>
            <div className="result-card">
              <h3>Time</h3>
              <div className="result-value">{formatTime(results.timeTaken)}</div>
            </div>
          </div>
          <button onClick={resetTest} className="btn btn-primary">
            Take Another Test
          </button>
        </div>
      )}
    </div>
  );
};

export default TypingTest; 