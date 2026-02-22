import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashMessages, setFlashMessages] = useState([]);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);
    if (success) {
      navigate('/products');
    } else {
      setFlashMessages([{ category: 'error', text: 'Invalid email or password. Please try again.' }]);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Flash Messages */}
      {flashMessages.length > 0 && (
        <div className="flash-messages" style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          {flashMessages.map((message, index) => (
            <div key={index} className={`flash-message flash-${message.category}`}>
              <i className={`fas fa-${message.category === 'success' ? 'check-circle' : message.category === 'error' ? 'exclamation-circle' : 'info-circle'}`}></i>
              {message.text}
              <button className="flash-close" onClick={() => {
                const newMessages = [...flashMessages];
                newMessages.splice(index, 1);
                setFlashMessages(newMessages);
              }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="auth-split-form-side">
        <div className="auth-split-card">
          <div className="auth-header">
            <h2><i className="fas fa-sign-in-alt"></i> Welcome Back</h2>
            <p>Login to your FarmtoClick account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-control"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="form-checkbox"
                  />
                  Remember me
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Don't have an account? <Link to="/register">Register here</Link></p>
              <p><a href="/forgot-password">Forgot password?</a></p>
            </div>
          </div>
        </div>

      <div className="auth-split-image-side" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/images/farm.jpg)` }}>
        <div className="auth-split-image-overlay">
          <h1>FarmtoClick</h1>
          <p>Connecting local farmers directly with consumers for fresh, sustainable produce.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;