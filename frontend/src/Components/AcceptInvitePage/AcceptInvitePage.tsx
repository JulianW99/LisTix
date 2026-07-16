import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import type { InvitationDetails } from "../../types";
import "./AcceptInvitePage.css";

export function AcceptInvitePage() {
  const { token = "" } = useParams();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    api.invitation(token)
      .then((result) => setInvitation(result.invitation))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Invitation could not be loaded."))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await api.acceptInvitation(token, { displayName, password });
      setAccepted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Invitation could not be accepted.");
    } finally {
      setSaving(false);
    }
  };

  return <main className="invite-page">
    <Link className="invite-brand" to="/"><span><img src="/branding/listix-icon.png" alt="" /></span>LisTix</Link>
    <section className="invite-card">
      {loading ? <p className="muted">Loading invitation...</p> : accepted ? <>
        <span className="invite-icon success">✓</span>
        <p className="eyebrow">Access granted</p>
        <h1>Welcome to {invitation?.accountName}</h1>
        <p className="muted">Your user has been created. You can now sign in with {invitation?.email} and your new password.</p>
        <Link className="primary-button invite-login" to="/login">Continue to login</Link>
      </> : invitation ? <>
        <span className="invite-icon">✦</span>
        <p className="eyebrow">{invitation.invitationType === "system_admin" ? "System administration invitation" : "Team invitation"}</p>
        <h1>Join {invitation.accountName}</h1>
        <p className="muted">You were invited as <strong>{invitation.role}</strong>. Create your personal password to access {invitation.invitationType === "system_admin" ? "the LisTix system administration" : "the shared workspace"}.</p>
        <form onSubmit={submit}>
          <label className="field"><span>Email</span><input value={invitation.email} disabled /></label>
          <label className="field"><span>Your name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} required /></label>
          <label className="field"><span>Create password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} required /></label>
          <label className="field"><span>Confirm password</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={10} required /></label>
          {error && <p className="error-message">{error}</p>}
          <button className="primary-button" disabled={saving}>{saving ? "Creating account..." : "Accept invitation"}</button>
        </form>
      </> : <>
        <span className="invite-icon error">!</span>
        <h1>Invitation unavailable</h1>
        <p className="error-message">{error || "This invitation is invalid or has expired."}</p>
        <Link className="secondary-button invite-login" to="/">Back to LisTix</Link>
      </>}
    </section>
  </main>;
}
