import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, QUICK_ACCOUNTS } from '../context/AuthContext';
import { Activity, ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, login, quickLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid credentials or login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (key: keyof typeof QUICK_ACCOUNTS) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await quickLogin(key);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to switch user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-8">
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30 mb-3">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Agency Pulse Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time project operations with RBAC & live activity
          </p>
        </div>

        {/* Quick 1-Click Role Switcher for Hiring Evaluators */}
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 mb-2 text-indigo-400">
            <UserCheck className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">
              Quick Role Switcher (Seeded Credentials)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Click any account to authenticate instantly:
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {(Object.keys(QUICK_ACCOUNTS) as Array<keyof typeof QUICK_ACCOUNTS>).map((key) => {
              const acc = QUICK_ACCOUNTS[key];
              return (
                <button
                  key={key}
                  id={`btn-quick-login-${key.toLowerCase()}`}
                  onClick={() => handleQuickLogin(key)}
                  disabled={isSubmitting}
                  className="flex flex-col items-start rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 text-left hover:border-indigo-500 hover:bg-slate-800/80 transition-all disabled:opacity-50"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 truncate">{acc.name}</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                      {acc.role.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5">{acc.email}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Standard Manual Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="input-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@agency.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="input-login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
