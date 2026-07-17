import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useApi } from "../../Context/ApiContext";
import { formatDate } from "../../Functions/formatDate";
import type { AutomationStatus, PlatformAction } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import { Modal } from "../Modal/Modal";
import "./SystemActionsPage.css";

type NotificationResult = { status?: string; reason?: string; channelId?: string };
const titleForType = (type: string) => ({ sale: "New sale", new_sale: "New sale", retransfer: "Re-transfer", transfer_reminder: "Transfer required", delivery_deadline_passed: "Transfer required", retransfer_unmatched: "Unmatched re-transfer", sale_not_sent: "Sale not sent" }[type] ?? type.replace(/_/g, " "));
const notificationsFor = (action: PlatformAction) => (action.details.notifications ?? {}) as { email?: NotificationResult; discord?: NotificationResult; pushover?: NotificationResult };

export function SystemActionsPage() {
  const { systemUsers, loadSystemUsers } = useApi();
  const [actions, setActions] = useState<PlatformAction[]>([]);
  const [automation, setAutomation] = useState<AutomationStatus | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [actionType, setActionType] = useState("retransfer");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [selected, setSelected] = useState<PlatformAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => { const [actionResult, statusResult] = await Promise.all([api.systemActions(), api.automationStatus()]); setActions(actionResult.items); setAutomation(statusResult); }, []);
  useEffect(() => { void loadSystemUsers(); void load().catch((requestError) => setError(requestError.message)); }, [load, loadSystemUsers]);
  useEffect(() => { if (!selectedUserId && systemUsers?.length) setSelectedUserId(String(systemUsers[0].id)); }, [selectedUserId, systemUsers]);
  const rows = useMemo(() => actions.filter((action) => filter === "all" || (filter === "resolved" ? action.status === "resolved" : action.status !== "resolved")), [actions, filter]);
  const trigger = async () => {
    if (!selectedUserId) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api.triggerSystemTestAction({ userId: Number(selectedUserId), actionType });
      const notificationText = result.notifications ? " The real notification workflow was executed; delivery results are stored in the action." : "";
      setMessage(`Test action ACT-${String(result.actionId).padStart(6, "0")} created.${notificationText}`); await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to run test action."); }
    finally { setBusy(false); }
  };
  const pollMailbox = async () => {
    setBusy(true); setError(""); setMessage("");
    try { const result = await api.pollAutomationMailbox(); setMessage(result.skipped ? "IMAP is not configured, so the mailbox poll was skipped." : `${result.processed ?? 0} re-transfer email(s) processed.`); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Mailbox poll failed."); }
    finally { setBusy(false); }
  };
  const resolve = async (action: PlatformAction) => { setBusy(true); try { await api.resolveSystemAction(action.id); await load(); setSelected(null); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to resolve action."); } finally { setBusy(false); } };
  const columns: DataTableColumn<PlatformAction>[] = [
    { key: "action", header: "Action", render: (action) => <><strong>{action.actionCode}</strong><small>{titleForType(action.actionType)} · {action.source}</small></> },
    { key: "user", header: "User", render: (action) => action.userName ? <><strong>{action.userName}</strong><small>{action.userEmail}</small></> : <span className="muted-light">Unmatched</span> },
    { key: "sale", header: "Sale", render: (action) => action.listixSaleId ? <><strong>{action.listixSaleId}</strong><small>{action.marketplaceSaleId}</small></> : "—" },
    { key: "detected", header: "Detected", render: (action) => <><strong>{formatDate(action.detectedAt)}</strong><small>{new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(action.detectedAt))}</small></> },
    { key: "delivery", header: "Notifications", render: (action) => { const notifications = notificationsFor(action); return <div className="notification-pills"><span className={notifications.email?.status || "none"}>Email {notifications.email?.status || "—"}</span><span className={notifications.discord?.status || "none"}>Discord {notifications.discord?.status || "—"}</span><span className={notifications.pushover?.status || "none"}>Pushover {notifications.pushover?.status || "—"}</span></div>; } },
    { key: "status", header: "Status", render: (action) => <span className={`action-status ${action.status}`}>{action.status}</span> },
    { key: "actions", header: <span className="visually-hidden">Actions</span>, render: (action) => <button className="system-button" type="button" onClick={() => setSelected(action)}>Details</button> },
  ];
  return <div className="system-page system-actions-page">
    <section className="automation-strip system-panel"><div><span className="system-kicker">Automation health</span><h2>Mailbox & notifications</h2></div><div className="automation-services"><span className={automation?.imap ? "online" : "offline"}><i />IMAP</span><span className={automation?.smtp ? "online" : "offline"}><i />Email</span><span className={automation?.discord ? "online" : "offline"}><i />Discord Bot</span><span className={automation?.pushover ? "online" : "offline"}><i />Pushover</span></div><button className="system-button" type="button" disabled={busy} onClick={() => void pollMailbox()}>Poll mailbox now</button></section>
    <section className="system-panel action-test-panel"><div><span className="system-kicker">Workflow test</span><h2>Simulate a platform event</h2><p>Select a user and action. LisTix uses that user's latest sale and runs the same configured email, Discord and Pushover workflow as a live event.</p></div><div className="action-test-controls"><label><span>User</span><select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>{(systemUsers ?? []).map((user) => <option key={user.id} value={user.id}>{user.displayName} · {user.email}</option>)}</select></label><label><span>Action</span><select value={actionType} onChange={(event) => setActionType(event.target.value)}><option value="retransfer">Re-transfer</option><option value="sale">New sale</option><option value="transfer_reminder">Transfer required</option></select></label><button className="system-button primary" type="button" disabled={busy || !selectedUserId} onClick={() => void trigger()}>{busy ? "Running…" : "Run workflow"}</button></div>{message && <p className="system-success">{message}</p>}{error && <p className="system-error">{error}</p>}</section>
    <section className="system-panel system-data-panel"><header className="system-panel-header"><div><span className="system-kicker">Operations queue</span><h2>Platform actions</h2><p>Re-transfers, missed deadlines and automation events in one audit trail.</p></div></header><div className="system-filter-row"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>Open</button><button className={filter === "resolved" ? "active" : ""} onClick={() => setFilter("resolved")}>Resolved</button><span>{rows.length} actions</span></div><DataTable columns={columns} rows={rows} rowKey={(action) => action.id} emptyMessage="No actions match this view." /></section>
    {selected && <Modal title={selected.actionCode} className="system-modal" onClose={() => setSelected(null)}><div className="action-detail-heading"><span className={`action-severity ${selected.severity}`}>{selected.severity}</span><h3>{selected.title}</h3><p>Detected {formatDate(selected.detectedAt)} from {selected.source}.</p></div><div className="system-detail-grid"><div><span>User</span><strong>{selected.userName || "Unmatched"}</strong></div><div><span>LisTix Sale ID</span><strong>{selected.listixSaleId || "—"}</strong></div><div><span>Marketplace Sale ID</span><strong>{selected.marketplaceSaleId || "—"}</strong></div><div><span>Discord channel</span><strong>{selected.discordChannelId || "Not created"}</strong></div></div><div className="notification-detail"><h3>Notification delivery</h3><div><span>Email</span><strong>{notificationsFor(selected).email?.status || "Not attempted"}</strong><small>{notificationsFor(selected).email?.reason}</small></div><div><span>Discord</span><strong>{notificationsFor(selected).discord?.status || "Not attempted"}</strong><small>{notificationsFor(selected).discord?.reason}</small></div><div><span>Pushover</span><strong>{notificationsFor(selected).pushover?.status || "Not attempted"}</strong><small>{notificationsFor(selected).pushover?.reason}</small></div></div><div className="modal-actions">{selected.status !== "resolved" && <button className="system-button primary" type="button" disabled={busy} onClick={() => void resolve(selected)}>Mark resolved</button>}<button className="system-button" type="button" onClick={() => setSelected(null)}>Close</button></div></Modal>}
  </div>;
}
