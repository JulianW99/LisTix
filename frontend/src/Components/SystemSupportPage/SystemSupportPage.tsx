import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useApi } from "../../Context/ApiContext";
import { formatDate } from "../../Functions/formatDate";
import { formatSupportStatus } from "../../Functions/formatSupportStatus";
import { getDateRange, type DateRangePreset } from "../../Functions/getDateRange";
import type { SupportFilters, SupportTicket } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import "./SystemSupportPage.css";

export function SystemSupportPage() {
  const { systemTickets, systemTopics, supportDashboard, loadSystemTickets, loadSystemTopics, loadSupportDashboard, loadSupportTicket, replyAsSystemAdmin, updateSupportStatus, createSupportTopic, deleteSupportTopic } = useApi();
  const initialRange = getDateRange("LTM");
  const [mode, setMode] = useState<"tickets" | "dashboard">("tickets"); const [scope, setScope] = useState<"live" | "history">("live");
  const [from, setFrom] = useState(initialRange.from); const [to, setTo] = useState(initialRange.to); const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null); const [reply, setReply] = useState(""); const [status, setStatus] = useState<SupportTicket["status"]>("open"); const [saving, setSaving] = useState(false); const [topicName, setTopicName] = useState("");
  const filters = useMemo<SupportFilters>(() => ({ scope, ...(scope === "history" ? { from, to } : {}) }), [from, scope, to]);
  useEffect(() => { if (mode === "tickets") void loadSystemTickets(filters); else void loadSupportDashboard(filters); }, [filters, mode]);
  useEffect(() => { if (settingsOpen) void loadSystemTopics(); }, [loadSystemTopics, settingsOpen]);
  const usePreset = (preset: DateRangePreset) => { const range = getDateRange(preset); setFrom(range.from); setTo(range.to); };
  const openTicket = async (ticket: SupportTicket) => { const detail = await loadSupportTicket(ticket.ticketId, true); setSelected(detail); setStatus(detail.status); };
  const sendReply = async (event: FormEvent) => { event.preventDefault(); if (!selected) return; setSaving(true); try { setSelected(await replyAsSystemAdmin(selected.ticketId, reply)); setReply(""); } finally { setSaving(false); } };
  const saveStatus = async () => { if (!selected) return; setSaving(true); try { const item = await updateSupportStatus(selected.ticketId, status); setSelected(item); await (mode === "tickets" ? loadSystemTickets(filters) : loadSupportDashboard(filters)); } finally { setSaving(false); } };
  const addTopic = async (event: FormEvent) => { event.preventDefault(); if (!topicName.trim()) return; await createSupportTopic(topicName); setTopicName(""); };
  const columns: DataTableColumn<SupportTicket>[] = [
    { key: "id", header: "Ticket", render: (ticket) => <button className="ticket-link" type="button" onClick={() => void openTicket(ticket)}>{ticket.ticketId}</button> },
    { key: "user", header: "User", render: (ticket) => <><strong>{ticket.userName}</strong><small>{ticket.userEmail}</small></> },
    { key: "topic", header: "Topic", render: (ticket) => ticket.topic },
    { key: "text", header: "Initial message", render: (ticket) => <span className="ticket-preview">{ticket.text}</span> },
    { key: "messages", header: "Messages", className: "numeric-column", render: (ticket) => ticket.messageCount },
    { key: "status", header: "Status", render: (ticket) => <span className={`support-status ${ticket.status}`}>{formatSupportStatus(ticket.status)}</span> },
    { key: "updated", header: "Last update", render: (ticket) => formatDate(ticket.updatedAt) },
  ];
  return <div className="system-support-page">
    <section className="support-controlbar system-panel"><div className="control-group"><button className={mode === "tickets" ? "active" : ""} onClick={() => setMode("tickets")}>Tickets</button><button className={mode === "dashboard" ? "active" : ""} onClick={() => setMode("dashboard")}>Dashboard</button></div><div className="control-group"><button className={scope === "live" ? "active" : ""} onClick={() => setScope("live")}>Live</button><button className={scope === "history" ? "active" : ""} onClick={() => setScope("history")}>History</button></div>{scope === "history" && <><div className="date-range"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /><span>to</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div><div className="quick-range">{(["1M", "3M", "LTM"] as DateRangePreset[]).map((preset) => <button key={preset} onClick={() => usePreset(preset)}>{preset}</button>)}</div></>}<button className="system-button settings-button" type="button" onClick={() => setSettingsOpen(true)}>Settings</button></section>
    {mode === "tickets" ? <section className="system-panel support-ticket-panel"><header><div><h2>{scope === "live" ? "Live support queue" : "Ticket history"}</h2><p>{systemTickets?.length ?? 0} tickets in the current view.</p></div></header><DataTable columns={columns} rows={systemTickets ?? []} rowKey={(ticket) => ticket.id} /></section> : <section className="support-dashboard"><article className="system-panel dashboard-total"><span>Total {scope} tickets</span><strong>{supportDashboard?.total ?? 0}</strong></article><div className="topic-dashboard">{supportDashboard?.topics.map((topic) => <article className="system-panel" key={topic.topicId}><span>{topic.topic}</span><strong>{topic.count}</strong><small>{supportDashboard.total ? ((topic.count / supportDashboard.total) * 100).toFixed(0) : 0}% of tickets</small></article>)}</div></section>}
    {selected && <div className="system-modal-backdrop"><section className="system-ticket-modal"><header><div><strong>{selected.ticketId}</strong><small>{selected.userName} · {selected.topic}</small></div><button type="button" onClick={() => setSelected(null)}>x</button></header><div className="system-ticket-body"><div className="system-messages">{selected.messages?.map((message) => <article className={message.authorRole === "system_admin" ? "admin" : "customer"} key={message.id}><strong>{message.authorName}</strong><p>{message.body}</p><small>{formatDate(message.createdAt)}</small></article>)}</div><form onSubmit={sendReply}><textarea rows={4} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a response" required /><button className="system-button primary" disabled={saving}>Send response</button></form></div><footer><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as SupportTicket["status"])}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label><button className="system-button primary" type="button" disabled={saving || status === selected.status} onClick={() => void saveStatus()}>Save status</button></footer></section></div>}
    {settingsOpen && <div className="system-modal-backdrop"><section className="topic-settings-modal"><header><div><strong>Support topics</strong><small>Add or remove ticket categories.</small></div><button type="button" onClick={() => setSettingsOpen(false)}>x</button></header><form onSubmit={addTopic}><input value={topicName} onChange={(event) => setTopicName(event.target.value)} placeholder="New topic name" required /><button className="system-button primary">Add topic</button></form><div>{systemTopics?.filter((topic) => topic.isActive).map((topic) => <article key={topic.id}><span>{topic.name}</span><button className="system-button" type="button" onClick={() => void deleteSupportTopic(topic.id)}>Delete</button></article>)}</div></section></div>}
  </div>;
}
