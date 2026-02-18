/**
 * Admin login: email/password, store JWT, redirect to /admin.
 */
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { authApi } from '../api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('scanpay_token');

  if (token) return <Navigate to="/admin" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('scanpay_token', res.token);
      navigate('/admin', { replace: true });
    } catch (err) {
      const msg = err.message || 'Login failed';
      const hint = err.status === 401 ? ' Create an admin by running in backend: node src/scripts/seed.js (default: admin@scanpay.local / admin123)' : '';
      setError(msg + hint);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[360px] bg-surface border border-border rounded-lg p-8">
        <h1 className="m-0 mb-1 text-2xl font-bold">Admin Login</h1>
        <p className="text-muted text-sm m-0 mb-6">Scan & Pay – Admin / Exit Guard</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-error/15 text-error py-2 px-3 rounded-md text-sm" role="alert">
              {error}
            </div>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              className="py-2.5 px-3 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              className="py-2.5 px-3 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="py-3 bg-accent text-white border-0 rounded-lg font-semibold mt-1 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <a href="/" className="inline-block mt-4 text-sm text-accent">
          ← Back to checkout
        </a>
      </div>
    </div>
  );
}
