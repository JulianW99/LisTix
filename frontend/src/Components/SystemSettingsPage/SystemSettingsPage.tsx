import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { useApi } from "../../Context/ApiContext";
import { hasPermission } from "../../Functions/hasPermission";
import type { MarketplaceControls, SystemTeamConfiguration } from "../../types";
import "./SystemSettingsPage.css";

const permissionLabel = (permission: string) => permission.replace("system.", "").replace(".", " · ");

export function SystemSettingsPage() {
  const { user } = useApi();
  const [marketplaces, setMarketplaces] = useState<MarketplaceControls | null>(null);
  const [team, setTeam] = useState<SystemTeamConfiguration | null>(null);
  const [email, setEmail] = useState(""); const [role, setRole] = useState("moderator"); const [permissions, setPermissions] = useState<string[]>([]);
  const [inviteUrl, setInviteUrl] = useState(""); const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  const canViewMarketplaces = hasPermission(user, "system.marketplaces.view"); const canManageMarketplaces = hasPermission(user, "system.marketplaces.manage");
  const canViewTeam = hasPermission(user, "system.team.view"); const canManageTeam = hasPermission(user, "system.team.manage");
  const loadTeam = () => api.systemTeam().then((result) => { setTeam(result); const preset = result.roles.find((item) => item.role === role); setPermissions((current) => current.length ? current : preset?.permissions ?? []); });
  useEffect(() => { if (canViewMarketplaces) void api.systemMarketplaces().then(setMarketplaces).catch((requestError) => setError(requestError.message)); if (canViewTeam) void loadTeam().catch((requestError) => setError(requestError.message)); }, []);
  const toggleAll = async (enabled: boolean) => { setBusy("all"); setError(""); try { setMarketplaces(await api.updateAllSystemMarketplaces(enabled)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to update marketplaces."); } finally { setBusy(""); } };
  const toggleMarketplace = async (marketplace: string, enabled: boolean) => { setBusy(marketplace); setError(""); try { setMarketplaces(await api.updateSystemMarketplace(marketplace, enabled)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to update marketplace."); } finally { setBusy(""); } };
  const changeRole = (nextRole: string) => { setRole(nextRole); setPermissions(team?.roles.find((item) => item.role === nextRole)?.permissions ?? []); };
  const changeMemberRole = async (memberId: number, nextRole: string) => {
    setBusy(`member-${memberId}`); setError("");
    try {
      const nextPermissions = team?.roles.find((item) => item.role === nextRole)?.permissions ?? [];
      await api.updateSystemTeamMember(memberId, { role: nextRole, permissions: nextPermissions });
      await loadTeam();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update member role.");
    } finally { setBusy(""); }
  };
  const invite = async (event: FormEvent) => { event.preventDefault(); setBusy("invite"); setError(""); try { const result = await api.inviteSystemTeamMember({ email, role, permissions }); setInviteUrl(result.inviteUrl); setEmail(""); await loadTeam(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to invite member."); } finally { setBusy(""); } };
  return <div className="system-page system-settings-page">
    {error && <p className="system-error">{error}</p>}
    {canViewMarketplaces && <section className="system-panel marketplace-controls"><header className="system-panel-header"><div><span className="system-kicker">Distribution controls</span><h2>Marketplace state</h2><p>Pause marketplace publications globally while preserving every previous listing state.</p></div>{canManageMarketplaces && <label className="system-switch master"><input type="checkbox" checked={marketplaces?.allEnabled ?? false} disabled={Boolean(busy)} onChange={(event) => void toggleAll(event.target.checked)} /><span /><b>All marketplaces</b></label>}</header><div className="marketplace-control-list">{marketplaces?.marketplaces.map((marketplace) => <article key={marketplace.marketplace}><div><strong>{marketplace.marketplace}</strong><small>{marketplace.liveListings} live · {marketplace.pausedListings} paused · {marketplace.errorListings} errors</small></div><span className={marketplace.enabled ? "marketplace-state enabled" : "marketplace-state"}>{marketplace.enabled ? "Enabled" : "Disabled"}</span>{canManageMarketplaces && <label className="system-switch"><input type="checkbox" checked={marketplace.enabled} disabled={Boolean(busy)} onChange={(event) => void toggleMarketplace(marketplace.marketplace, event.target.checked)} /><span /></label>}</article>)}</div></section>}
    {canViewTeam && <section className="system-panel system-team-panel"><header className="system-panel-header"><div><span className="system-kicker">Access control</span><h2>System administration team</h2><p>Invite moderators and staff with only the permissions they need.</p></div></header>{canManageTeam && <form className="system-invite-form" onSubmit={invite}><label><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label><span>Role</span><select value={role} onChange={(event) => changeRole(event.target.value)}>{team?.roles.map((item) => <option key={item.role} value={item.role}>{item.role}</option>)}</select></label><fieldset><legend>Permissions</legend><div>{team?.permissions.map((permission) => <label key={permission}><input type="checkbox" checked={permissions.includes(permission)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))} />{permissionLabel(permission)}</label>)}</div></fieldset><button className="system-button primary" disabled={busy === "invite"}>{busy === "invite" ? "Inviting..." : "Send invitation"}</button></form>}{inviteUrl && <div className="system-invite-link"><span>Invitation created</span><code>{inviteUrl}</code><button className="system-button" onClick={() => void navigator.clipboard.writeText(inviteUrl)}>Copy link</button></div>}<div className="system-member-list">{team?.members.map((member) => <article key={member.id}><div><strong>{member.displayName}</strong><small>{member.email} · {member.status}</small></div>{canManageTeam ? <select value={member.role} disabled={busy === `member-${member.id}`} onChange={(event) => void changeMemberRole(member.id, event.target.value)}>{team.roles.map((item) => <option key={item.role} value={item.role}>{item.role}</option>)}</select> : <span>{member.role}</span>}{canManageTeam && <><select value={member.status} disabled={busy === `member-${member.id}`} onChange={async (event) => { await api.updateSystemTeamMember(member.id, { status: event.target.value }); await loadTeam(); }}><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="revoked">Revoked</option></select><button className="system-button" disabled={busy === `member-${member.id}`} onClick={async () => { await api.deleteSystemTeamMember(member.id); await loadTeam(); }}>Remove</button></>}</article>)}</div></section>}
  </div>;
}
