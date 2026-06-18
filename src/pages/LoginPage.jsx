// Login page
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AuthPages.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Successfully logged in, redirect to app
        navigate('/app');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // Note: Google OAuth will redirect automatically, no need to navigate here
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="logo">🎆 Fireworks Inventory</Link>
        </div>

        <div className="auth-card">
          <h1>Welcome Back</h1>
          <p className="auth-subtitle">Log in to your account</p>

          <div className="demo-notice">
            <strong>Note:</strong> Create an account to get started, or sign in if you already have one.
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-footer">
              <label className="checkbox-label">
                <input type="checkbox" />
                Remember me
              </label>
              <a href="/forgot-password" className="forgot-link">Forgot password?</a>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button 
            type="button"
            className="btn-social btn-google"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <img src="https://www.google.com/favicon.ico" alt="" />
            Continue with Google
          </button>

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>

        <div className="auth-footer">
          <Link to="/">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
