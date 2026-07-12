import { useState, type FormEvent } from "react";
import "./LoginPage.css";
export function LoginPage({ error, onLogin }: { error: string; onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("admin@ticketadmin.local"); const [password, setPassword] = useState("ChangeMe123!"); const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSubmitting(true); try { await onLogin(email, password); } finally { setSubmitting(false); } };
  return <main className="login-page"><section className="login-panel panel"><span className="login-logo">L</span><p className="eyebrow">LisTix</p><h1>Operations login</h1><p className="muted">Sign in to manage listings, sales and payouts.</p><form onSubmit={submit}><label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label className="field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="error-message">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button></form></section></main>;
}
