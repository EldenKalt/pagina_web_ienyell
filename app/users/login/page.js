'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { loginDestination } from '../../../lib/loginReturn';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace(loginDestination(new URLSearchParams(window.location.search).get('returnTo'), user.role));
  }, [user, isLoading, router]);

  if (isLoading || user) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (loginError) {
      setError(loginError?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cms-login-page">
      <div className="cms-login-card">
        <h1 className="cms-login-title">ienyell</h1>
        <p className="cms-login-subtitle">Sign in to your account</p>

        {error && (
          <div className="cms-login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cms-login-form">
          <label className="cms-login-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              className="cms-input"
              required
              autoFocus
              autoComplete="email"
            />
          </label>

          <label className="cms-login-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="cms-input"
              required
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            className="cms-btn cms-btn-primary cms-login-submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
