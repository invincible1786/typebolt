import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      login(response.data.user, response.data.token);
    } catch (err) {
      const errorData = err.response?.data?.error;
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        const fieldMap = {};
        errorData.errors.forEach(issue => {
          fieldMap[issue.field] = issue.message;
        });
        setFieldErrors(fieldMap);
        setError(errorData.message || 'Please correct the highlighted fields.');
      } else {
        setError(errorData?.message || err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="form-container">
        <h2 className="form-title">⚡ Sign In to TypeBolt</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
            {fieldErrors.email && <span className="field-error-text">⚠️ {fieldErrors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
            {fieldErrors.password && <span className="field-error-text">⚠️ {fieldErrors.password}</span>}
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '15px' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        <div className="text-center mt-20">
          <p>Don't have an account? <Link to="/register" className="link">Register here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login; 