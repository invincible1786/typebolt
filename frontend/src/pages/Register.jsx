import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './Register.css';

const Register = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (formData.password.length < 6) {
      setFieldErrors({ password: 'Password must be at least 6 characters long' });
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await authAPI.register(registerData);
      login(response.data.user, response.data.token);
    } catch (err) {
      const errorData = err.response?.data?.error;
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        const fieldMap = {};
        errorData.errors.forEach(issue => {
          fieldMap[issue.field] = issue.message;
        });
        setFieldErrors(fieldMap);
        setError(errorData.message || 'Please fix the issues highlighted below.');
      } else {
        setError(errorData?.message || err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="form-container">
        <h2 className="form-title">Create your account</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              className={`form-input ${fieldErrors.username ? 'input-error' : ''}`}
              value={formData.username}
              onChange={handleChange}
              placeholder="e.g. speedtyper"
              required
            />
            {fieldErrors.username && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.username}
              </span>
            )}
          </div>
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
            {fieldErrors.email && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.email}
              </span>
            )}
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
              placeholder="At least 6 characters"
              required
            />
            {fieldErrors.password && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.password}
              </span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className={`form-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat password"
              required
            />
            {fieldErrors.confirmPassword && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.confirmPassword}
              </span>
            )}
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '15px' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="text-center mt-20">
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Already have an account? <Link to="/login" className="link">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;