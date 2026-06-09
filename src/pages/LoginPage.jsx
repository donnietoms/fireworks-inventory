// Login page
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AuthPages.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // TODO: Replace with actual authentication
    // For now, simulate login with demo admin account
    setTimeout(() => {
      // Check for demo admin account
      if (email === 'admin@fireworksinventory.com' && password === 'admin') {
        localStorage.setItem('user', JSON.stringify({ 
          email: 'admin@fireworksinventory.com', 
          name: 'Admin User',
          role: 'admin'
        }));
        // Force page reload to update user state in App.jsx
        window.location.href = '/app';
      } else if (email && password) {
        // Any other email/password combination works for demo
        localStorage.setItem('user', JSON.stringify({ 
          email, 
          name: email.split('@')[0],
          role: 'user'
        }));
        // Force page reload to update user state in App.jsx
        window.location.href = '/app';
      } else {
        setError('Please enter email and password');
        setLoading(false);
      }
    }, 500);
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
            <strong>Demo Account:</strong><br />
            Email: <code>admin@fireworksinventory.com</code><br />
            Password: <code>admin</code>
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

          <button className="btn-social btn-google">
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
