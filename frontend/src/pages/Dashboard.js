import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { typingAPI } from '../utils/api';
import { formatTime, getSpeedTier } from '../utils/typingUtils';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'leaderboard'
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async (targetPage = 1) => {
    try {
      setLoading(true);
      const [statsResponse, historyResponse] = await Promise.all([
        typingAPI.getStats(),
        typingAPI.getHistory(targetPage, 8)
      ]);
      
      setStats(statsResponse.data);
      setHistory(historyResponse.data.results || []);
      setPagination({
        page: historyResponse.data.page || 1,
        totalPages: historyResponse.data.totalPages || 1,
        total: historyResponse.data.total || 0
      });
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLeaderboardLoading(true);
      const res = await typingAPI.getLeaderboard(10);
      setLeaderboard(res.data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(1);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab === 'leaderboard' && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  }, [activeTab, leaderboard.length, fetchLeaderboard]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.page) {
      fetchDashboardData(newPage);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Your Typing Command Center</h1>
        <p>Track your speed evolution, analyze performance metrics, and climb the ranks</p>
      </div>

      {/* Statistics Section */}
      <div className="stats-section">
        <h2>Overall Performance</h2>
        {loading && !stats ? (
          <div className="stats-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card skeleton-card">
                <div className="skeleton skeleton-icon"></div>
                <div className="skeleton skeleton-text" style={{ width: '60%', margin: '0 auto 10px' }}></div>
                <div className="skeleton skeleton-title" style={{ width: '40%', margin: '0 auto' }}></div>
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <h3>Total Tests</h3>
              <div className="stat-value">{stats.totalTests}</div>
              <span className="stat-subtext">Completed sessions</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <h3>Average WPM</h3>
              <div className="stat-value">{stats.averageWpm}</div>
              <span className="stat-subtext">Words per minute</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <h3>Best Speed</h3>
              <div className="stat-value">{stats.bestWpm}</div>
              {stats.bestWpm > 0 && (
                <div
                  className="tier-badge"
                  style={{
                    color: getSpeedTier(stats.bestWpm).color,
                    backgroundColor: getSpeedTier(stats.bestWpm).bg
                  }}
                >
                  {getSpeedTier(stats.bestWpm).icon} {getSpeedTier(stats.bestWpm).name}
                </div>
              )}
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <h3>Accuracy</h3>
              <div className="stat-value">{stats.averageAccuracy}%</div>
              <span className="stat-subtext">Precision average</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Tabs for History vs Global Leaderboard */}
      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Test History ({pagination.total})
        </button>
        <button
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Global Leaderboard (Top 10)
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => fetchDashboardData(pagination.page)} className="btn btn-primary" style={{ maxWidth: 160, margin: '15px auto 0' }}>
            Retry
          </button>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="history-section">
          {loading ? (
            <div className="history-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="history-item skeleton-item">
                  <div className="skeleton skeleton-title" style={{ width: '120px', height: '30px' }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '80%', height: '20px', marginTop: '15px' }}></div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="empty-history">
              <div className="empty-icon">⌨️</div>
              <h3>No typing tests recorded yet</h3>
              <p>Jump in to benchmark your typing speed, unlock badges, and track your progression!</p>
              <Link to="/test" className="btn btn-primary cta-btn">
                Launch First Typing Test →
              </Link>
            </div>
          ) : (
            <>
              <div className="history-list">
                {history.map((test, index) => {
                  const tier = getSpeedTier(test.wpm);
                  const errorCount = test.errorCount !== undefined ? test.errorCount : (test.errors || 0);
                  const testId = test._id || test.id || `history-${index}`;

                  return (
                    <div key={testId} className="history-item">
                      <div className="history-main">
                        <div className="history-wpm">
                          <span className="wpm-value">{test.wpm}</span>
                          <span className="wpm-label">WPM</span>
                          <span
                            className="tier-badge-sm"
                            style={{ color: tier.color, backgroundColor: tier.bg }}
                          >
                            {tier.icon} {tier.name}
                          </span>
                        </div>
                        <div className="history-details">
                          <div className="detail-row">
                            <span className="detail-label">Accuracy:</span>
                            <span className="detail-value">{test.accuracy}%</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Errors:</span>
                            <span className="detail-value">{errorCount}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Duration:</span>
                            <span className="detail-value">{formatTime(test.timeTaken)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="history-meta">
                        <div className="test-date">
                          📅 {new Date(test.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="test-time">
                          ⏰ {new Date(test.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {test.paragraph && (
                        <div className="history-preview">
                          <p>"{test.paragraph.substring(0, 110)}..."</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="pagination-container">
                  <button
                    className="pagination-btn"
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    ← Previous
                  </button>
                  <span className="pagination-info">
                    Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
                  </span>
                  <button
                    className="pagination-btn"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Global Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="leaderboard-section">
          {leaderboardLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Fetching top speeds from Redis cache...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-history">
              <div className="empty-icon">🏅</div>
              <h3>Leaderboard is pristine</h3>
              <p>Be the very first typist to claim the #1 spot on the global rankings!</p>
              <Link to="/test" className="btn btn-primary cta-btn">
                Claim #1 Spot →
              </Link>
            </div>
          ) : (
            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Typist</th>
                    <th>Best WPM</th>
                    <th>Tier</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => {
                    const tier = getSpeedTier(entry.wpm);
                    const rankMedal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                    return (
                      <tr key={entry.rank} className={entry.rank <= 3 ? `top-rank rank-${entry.rank}` : ''}>
                        <td className="rank-cell">{rankMedal}</td>
                        <td className="user-cell">
                          <strong>{entry.username || 'Anonymous Typist'}</strong>
                        </td>
                        <td className="wpm-cell">
                          <span className="leaderboard-wpm">{entry.wpm}</span> <span className="unit">WPM</span>
                        </td>
                        <td>
                          <span className="tier-badge-sm" style={{ color: tier.color, backgroundColor: tier.bg }}>
                            {tier.icon} {tier.name}
                          </span>
                        </td>
                        <td className="accuracy-cell">{entry.accuracy ? `${entry.accuracy}%` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard; 