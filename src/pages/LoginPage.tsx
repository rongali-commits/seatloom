import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth, consumeReturnPath } from '@/lib/auth';
import { BrandMark } from '@/components/BrandMark';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fromPath = new URLSearchParams(location.search).get('from');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    const returnPath = fromPath || consumeReturnPath();
    navigate(returnPath);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 text-ink mb-6">
            <BrandMark className="w-8 h-8" />
            <span className="font-display text-xl font-700 tracking-tight">Seatloom</span>
          </Link>
          <h1 className="text-headline text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in to your Seatloom account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="li-email" className="field-label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-ink-faint" />
              <input
                id="li-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input pl-10"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <label htmlFor="li-password" className="field-label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-ink-faint" />
              <input
                id="li-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input pl-10"
                placeholder="Your password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          New to Seatloom?{' '}
          <Link to="/signup" className="text-plum-700 font-medium hover:text-plum-800 transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
