import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api } from "../../api";
import { useApi } from "../../Context/ApiContext";
import { hasPermission } from "../../Functions/hasPermission";
import type { ActivityItem, TeamConfiguration, TeamMember, User } from "../../types";
import { Modal } from "../Modal/Modal";
import "./TeamSettings.css";

const permissionLabels: Record<string, string> = {
  "dashboard.view": "View dashboard",
  "listings.view": "View listings",
  "listings.create": "Create listings",
  "listings.edit": "Edit listings",
  "listings.delete": "Delete listings",
  "sales.view": "View sales",
  "sales.fulfill": "Send tickets",
  "payments.view": "View payments",
  "integrations.view": "View connections",
  "integrations.manage": "Manage connections",
  "settings.view": "View settings",
  "settings.manage": "Manage account settings",
  "team.view": "View team",
  "team.manage": "Manage team",
  "audit.view": "View activity log",
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  administrator: "Administrator",
  manager: "Manager",
  moderator: "Moderator",
  viewer: "Viewer",
};

const actionLabels: Record<string, string> = {
  "team.enabled": "enabled multi-user support",
  "team.disabled": "disabled multi-user support",
  "team.member_invited": "invited a team member",
  "team.member_updated": "updated a team member",
  "team.member_removed": "removed a team member",
  "team.invitation_accepted": "accepted a team invitation",
  "listing.created": "created a listing",
  "listing.updated": "updated a listing",
  "listing.deleted": "deleted a listing",
  "sale.sent": "sent tickets for a sale",
  "settings.updated": "updated account settings",
  "connection.discord_connected": "connected Discord",
  "connection.discord_disconnected": "disconnected Discord",
};

type MemberDraft = { role: TeamMember["role"]; permissions: string[] };

export function TeamSettings({ user }: { user: User }) {
  const { refreshUser } = useApi();
  const canManage = hasPermission(user, "team.manage");
  const canAudit = hasPermission(user, "audit.view");
  const [configuration, setConfiguration] = useState<TeamConfiguration | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamMember["role"]>("viewer");
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
  const invitePermissionsInitialized = useRef(false);
  const [invitePermissionsOpen, setInvitePermissionsOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, MemberDraft>>({});
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteRecipient, setInviteRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      const [teamResult, activityResult] = await Promise.all([
        api.team(),
        canAudit ? api.teamActivity() : Promise.resolve({ items: [] }),
      ]);
      setConfiguration(teamResult);
      setActivity(activityResult.items);
      setDrafts(Object.fromEntries(teamResult.members.map((member) => [member.id, {
        role: member.role,
        permissions: member.permissions,
      }])));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Team settings could not be loaded.");
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!configuration || invitePermissionsInitialized.current) return;
    invitePermissionsInitialized.current = true;
    setInvitePermissions(configuration.roles.find((item) => item.role === "viewer")?.permissions ?? []);
  }, [configuration]);

  const roles = configuration?.roles ?? [];
  const presetForRole = (nextRole: string) => roles.find((item) => item.role === nextRole)?.permissions ?? [];
  const togglePermission = (permissions: string[], permission: string) => permissions.includes(permission)
    ? permissions.filter((item) => item !== permission)
    : [...permissions, permission];

  const updateEnabled = async (enabled: boolean) => {
    setBusy("toggle");
    setError("");
    try {
      await api.updateTeamSettings(enabled);
      await Promise.all([load(), refreshUser()]);
      setMessage(enabled ? "Multi-user support enabled. Paused team access has been restored." : "Multi-user support disabled. Existing team members are paused and keep their roles and permissions.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Setting could not be updated.");
    } finally {
      setBusy("");
    }
  };

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("invite");
    setError("");
    setMessage("");
    try {
      const result = await api.inviteTeamMember({ email, role, permissions: invitePermissions });
      setInviteUrl(result.inviteUrl);
      setInviteRecipient(result.member.email);
      setEmail("");
      setRole("viewer");
      setInvitePermissions(presetForRole("viewer"));
      setInvitePermissionsOpen(false);
      await load();
      setMessage(`Invitation created for ${result.member.email}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Invitation could not be created.");
    } finally {
      setBusy("");
    }
  };

  const beginEdit = (member: TeamMember) => {
    setDrafts((current) => ({ ...current, [member.id]: { role: member.role, permissions: member.permissions } }));
    setEditingMemberId(member.id);
    setMessage("");
    setError("");
  };

  const saveMember = async (member: TeamMember) => {
    const draft = drafts[member.id];
    if (!draft) return;
    setBusy(`member-${member.id}`);
    setError("");
    try {
      await api.updateTeamMember(member.id, draft);
      setEditingMemberId(null);
      await load();
      setMessage(`${member.email} updated.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Member could not be updated.");
    } finally {
      setBusy("");
    }
  };

  const removeMember = async () => {
    if (!deleteTarget) return;
    setBusy(`delete-${deleteTarget.id}`);
    setError("");
    try {
      await api.deleteTeamMember(deleteTarget.id);
      const removedEmail = deleteTarget.email;
      setDeleteTarget(null);
      setEditingMemberId(null);
      await load();
      setMessage(`${removedEmail} removed from the account.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Member could not be removed.");
    } finally {
      setBusy("");
    }
  };

  const activeMembers = useMemo(
    () => configuration?.members.filter((member) => member.status === "active" && (configuration.account.multiUserEnabled || member.role === "owner")).length ?? 0,
    [configuration],
  );
  const pausedMembers = useMemo(
    () => configuration?.members.filter((member) => member.status === "active" && !configuration.account.multiUserEnabled && member.role !== "owner").length ?? 0,
    [configuration],
  );

  if (!configuration) return <section id="settings-team" className="panel page-panel settings-section"><p className="muted">Loading team access...</p>{error && <p className="error-message">{error}</p>}</section>;

  return <>
    <section id="settings-team" className="panel page-panel settings-section team-settings">
      <div className="page-header"><div><h2>Team & Access</h2><p>Invite operators and control exactly what they can see and change.</p></div><span className="team-count">{activeMembers} active{pausedMembers ? ` · ${pausedMembers} paused` : ""}</span></div>

      <div className="team-feature-toggle"><div><strong>Multi-user support</strong><span>Allow invited members to sign in to {configuration.account.name}.</span></div><label className="switch"><input type="checkbox" checked={configuration.account.multiUserEnabled} disabled={!canManage || busy === "toggle"} onChange={(event) => void updateEnabled(event.target.checked)} /><span /></label></div>
      {message && <p className="success-message team-message">{message}</p>}
      {error && <p className="error-message team-message">{error}</p>}

      {configuration.account.multiUserEnabled && canManage && <form className="team-invite-form" onSubmit={invite}>
        <div className="team-subheading"><div><h3>Invite a team member</h3><p>They will create their own password from the invitation link.</p></div></div>
        <div className="team-invite-row">
          <label className="field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="operator@company.com" required /></label>
          <label className="field"><span>Role</span><select value={role} onChange={(event) => { const nextRole = event.target.value as TeamMember["role"]; setRole(nextRole); setInvitePermissions(presetForRole(nextRole)); }}>{roles.map((item) => <option key={item.role} value={item.role}>{roleLabels[item.role]}</option>)}</select></label>
          <button className="secondary-button" type="button" onClick={() => setInvitePermissionsOpen((current) => !current)}>{invitePermissionsOpen ? "Hide restrictions" : "Edit restrictions"}</button>
          <button className="primary-button" disabled={busy === "invite"}>{busy === "invite" ? "Inviting..." : "Create invitation"}</button>
        </div>
        {invitePermissionsOpen && <div className="invite-permissions-editor"><div><strong>Individual restrictions</strong><span>Override the selected role preset before sending the invitation.</span></div><PermissionGrid permissions={configuration.permissions} selected={invitePermissions} onToggle={(permission) => setInvitePermissions((current) => togglePermission(current, permission))} /></div>}
      </form>}

      {inviteUrl && <div className="invite-link-result"><div><strong>Invitation link created</strong><span>Send this secure link to the invited person. It expires after 7 days.</span></div><input value={inviteUrl} readOnly /><a className="secondary-button" href={`mailto:${inviteRecipient}?subject=${encodeURIComponent(`Your LisTix invitation to ${configuration.account.name}`)}&body=${encodeURIComponent(`You have been invited to ${configuration.account.name} on LisTix. Create your password here: ${inviteUrl}`)}`}>Open email</a><button className="secondary-button" type="button" onClick={() => { void navigator.clipboard.writeText(inviteUrl); setMessage("Invitation link copied."); }}>Copy link</button></div>}

      <div className="team-members">
        <div className="team-subheading"><div><h3>Account members</h3><p>Roles and access changes apply immediately.</p></div></div>
        {configuration.members.map((member) => {
          const draft = drafts[member.id] ?? { role: member.role, permissions: member.permissions };
          const editable = canManage && member.role !== "owner" && member.userId !== user.id;
          const editing = editingMemberId === member.id;
          const accessPaused = !configuration.account.multiUserEnabled && member.status === "active" && member.role !== "owner";
          return <article className={`team-member ${editing ? "is-editing" : ""}`} key={member.id}>
            <div className="member-avatar">{member.displayName.slice(0, 2).toUpperCase()}</div>
            <div className="member-identity"><strong>{member.displayName}</strong><span>{member.email}</span><small>{member.lastSeenAt ? `Last active ${new Date(member.lastSeenAt).toLocaleString()}` : member.status === "pending" ? "Invitation not accepted yet" : "No activity yet"}</small></div>
            <span className={`member-status ${accessPaused ? "paused" : member.status}`}>{accessPaused ? "paused" : member.status}</span>
            <div className="member-role"><span>Role</span><strong>{roleLabels[member.role]}</strong></div>
            {editable ? <div className="member-actions"><button className="secondary-button" type="button" onClick={() => editing ? setEditingMemberId(null) : beginEdit(member)}>{editing ? "Cancel" : "Edit"}</button><button className="member-delete-button" type="button" onClick={() => setDeleteTarget(member)}>Delete</button></div> : <div className="member-owner-role"><small>{member.role === "owner" ? "All permissions" : "Your access"}</small></div>}

            {editing && editable && <div className="member-editor">
              <div className="member-editor-heading"><div><strong>Edit access</strong><span>Choose a role preset, then adjust each restriction individually.</span></div><label><span>Role preset</span><select value={draft.role} onChange={(event) => { const nextRole = event.target.value as TeamMember["role"]; setDrafts((current) => ({ ...current, [member.id]: { role: nextRole, permissions: presetForRole(nextRole) } })); }}>{roles.map((item) => <option key={item.role} value={item.role}>{roleLabels[item.role]}</option>)}</select></label></div>
              <PermissionGrid permissions={configuration.permissions} selected={draft.permissions} onToggle={(permission) => setDrafts((current) => ({ ...current, [member.id]: { ...draft, permissions: togglePermission(draft.permissions, permission) } }))} />
              <div className="member-editor-actions"><button className="secondary-button" type="button" onClick={() => setEditingMemberId(null)}>Cancel</button><button className="primary-button" type="button" disabled={busy === `member-${member.id}`} onClick={() => void saveMember(member)}>{busy === `member-${member.id}` ? "Saving..." : "Save changes"}</button></div>
            </div>}
          </article>;
        })}
      </div>
    </section>

    {canAudit && <section id="settings-activity" className="panel page-panel settings-section activity-settings"><div className="page-header"><div><h2>Activity Log</h2><p>A timestamped record of important actions across the account.</p></div><button className="secondary-button" type="button" onClick={() => void load()}>Refresh</button></div><div className="activity-list">{activity.map((item) => <article key={item.id}><span className="activity-dot" /><div><strong>{item.actorName}</strong> {actionLabels[item.action] || item.action.replace(/\./g, " ")}<small>{activitySubject(item)}</small></div><time>{new Date(item.createdAt).toLocaleString()}</time></article>)}{activity.length === 0 && <p className="muted">No recorded activity yet.</p>}</div></section>}

    {deleteTarget && <Modal title="Remove team member?" onClose={() => setDeleteTarget(null)}><p className="muted">Remove <strong>{deleteTarget.email}</strong> from this account? Their access ends immediately.</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="danger-button" type="button" disabled={busy === `delete-${deleteTarget.id}`} onClick={() => void removeMember()}>{busy === `delete-${deleteTarget.id}` ? "Removing..." : "Delete member"}</button></div></Modal>}
  </>;
}

function PermissionGrid({ permissions, selected, onToggle }: { permissions: string[]; selected: string[]; onToggle: (permission: string) => void }) {
  return <div className="permission-grid">{permissions.map((permission) => <label key={permission}><input type="checkbox" checked={selected.includes(permission)} onChange={() => onToggle(permission)} /><span>{permissionLabels[permission] || permission}</span></label>)}</div>;
}

function activitySubject(item: ActivityItem) {
  const label = item.metadata.orderCode || item.metadata.ticketCode || item.metadata.email || item.entityId;
  return label ? `${item.entityType} · ${String(label)}` : item.entityType;
}
