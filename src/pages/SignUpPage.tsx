import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { BrandMark } from '@/components/BrandMark';

export function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signUpError } = await signUp(email, password);
    setLoading(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    navigate('/studio');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 text-ink mb-6">
            <BrandMark className="w-8 h-8" />
            <span className="font-display text-xl font-700 tracking-tight">Seatloom</span>
          </Link>
          <h1 className="text-headline text-ink">Create your studio</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sign up to manage workshops and sessions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="su-email" className="field-label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-ink-faint" />
              <input
                id="su-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input pl-10"
                placeholder="you@studio.com"
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <label htmlFor="su-password" className="field-label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-ink-faint" />
              <input
                id="su-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input pl-10"
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-plum-700 font-medium hover:text-plum-800 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
