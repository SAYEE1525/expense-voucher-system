import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

const DEMO = [
  ['Employee', 'employee@abc.com'],
  ['Director', 'director@abc.com'],
  ['Accounts', 'accounts@abc.com'],
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    try { await login(email, password); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit} noValidate>
        <h1>Sign in</h1>
        <p className="muted">Create, approve and track expense vouchers.</p>
        {error && <div className="alert error">{error}</div>}
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="demo">
          <p className="muted">Demo accounts (password: <b>password123</b>)</p>
          {DEMO.map(([r, em]) => (
            <button type="button" key={em} className="chip" onClick={() => { setEmail(em); setPassword('password123'); }}>
              {r}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
