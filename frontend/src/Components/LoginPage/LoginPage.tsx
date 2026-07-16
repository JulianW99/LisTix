import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import "./LoginPage.css";

const demoAdminEmail = import.meta.env.VITE_DEMO_ADMIN_EMAIL?.trim()
  || (import.meta.env.DEV ? "admin@ticketadmin.local" : "");
const demoAdminPassword = import.meta.env.VITE_DEMO_ADMIN_PASSWORD
  || (import.meta.env.DEV ? "ChangeMe123!" : "");

export function LoginPage({ error, onLogin }: { error: string; onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState(demoAdminEmail);
  const [password, setPassword] = useState(demoAdminPassword);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin(email, password);
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="login-page">
    <Link className="login-back" to="/">&larr; Back to LisTix</Link>
    <section className="login-panel panel">
      <img className="login-logo" src="/branding/listix-logo.png" alt="LisTix" />
      <p className="eyebrow">LisTix</p>
      <h1>Operations login</h1>
      <p className="muted">Sign in to manage listings, sales and payouts.</p>
      <form onSubmit={submit}>
        <label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p className="error-message">{error}</p>}
        <button className="primary-button" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button>
      </form>
    </section>
  </main>;
}
