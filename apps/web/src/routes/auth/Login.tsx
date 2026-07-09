import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';

import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { authClient } from '../../lib/auth-client.js';
import { useUIStore } from '../../lib/store.js';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const { formatMessage } = useIntl();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? formatMessage({ id: 'auth.signin.error' }));
      } else {
        showToast(formatMessage({ id: 'auth.signin.success' }), 'success');
        navigate('/listas');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 animate-fade-in">
      <Input
        type="email"
        label={formatMessage({ id: 'auth.email' })}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <Input
        type="password"
        label={formatMessage({ id: 'auth.password' })}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      {error && <p className="text-sm text-blood-400">{error}</p>}
      <Button type="submit" loading={loading} fullWidth size="lg">
        <FormattedMessage id="auth.signin.cta" />
      </Button>
      <p className="text-center text-sm text-parchment-300">
        <FormattedMessage id="auth.register" /> ·{' '}
        <Link to="/register" className="text-blood-400 underline-offset-4 hover:underline">
          →
        </Link>
      </p>
    </form>
  );
}
