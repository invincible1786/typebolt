import React, { useState, useEffect } from 'react';
import { typingAPI } from '../utils/api';
import { formatTime, getSpeedCategory } from '../utils/typingUtils';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, historyResponse] = await Promise.all([
        typingAPI.getStats(),
        typingAPI.getHistory()
      ]);
      
      setStats(statsResponse.data);
      setHistory(historyResponse.data.results);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
        <button onClick={fetchDashboardData} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Your Typing Dashboard</h1>
        <p>Track your progress and view your typing history</p>
      </div>

      {stats && (
        <div className="stats-section">
          <h2>Overall Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <h3>Total Tests</h3>
              <div className="stat-value">{stats.totalTests}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <h3>Average WPM</h3>
              <div className="stat-value">{stats.averageWpm}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <h3>Best WPM</h3>
              <div className="stat-value">{stats.bestWpm}</div>
              <div className="stat-category">{getSpeedCategory(stats.bestWpm)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <h3>Average Accuracy</h3>
              <div className="stat-value">{stats.averageAccuracy}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="history-section">
        <h2>Recent Tests</h2>
        {history.length === 0 ? (
          <div className="empty-history">
            <p>No tests completed yet. Start your first typing test!</p>
          </div>
        ) : (
          <div className="history-list">
            {history.slice(0, 10).map((test) => (
              <div key={test.id} className="history-item">
                <div className="history-main">
                  <div className="history-wpm">
                    <span className="wpm-value">{test.wpm}</span>
                    <span className="wpm-label">WPM</span>
                  </div>
                  <div className="history-details">
                    <div className="detail-row">
                      <span className="detail-label">Accuracy:</span>
                      <span className="detail-value">{test.accuracy}%</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Errors:</span>
                      <span className="detail-value">{test.errors}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">{formatTime(test.timeTaken)}</span>
                    </div>
                  </div>
                </div>
                <div className="history-meta">
                  <div className="test-date">
                    {new Date(test.timestamp).toLocaleDateString()}
                  </div>
                  <div className="test-time">
                    {new Date(test.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div className="history-preview">
                  <p>{test.paragraph.substring(0, 100)}...</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 