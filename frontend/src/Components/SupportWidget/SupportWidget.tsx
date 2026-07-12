import { useEffect, useState, type FormEvent } from "react";
import { useApi } from "../../Context/ApiContext";
import { formatDate } from "../../Functions/formatDate";
import type { SupportTicket } from "../../types";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./SupportWidget.css";

export function SupportWidget() {
  const { supportTopics, supportTickets, loadSupport, loadSupportTicket, createSupportTicket, replyToTicket } = useApi();
  const [open, setOpen] = useState(false); const [view, setView] = useState<"list" | "create" | "detail">("list"); const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [topicId, setTopicId] = useState(""); const [text, setText] = useState(""); const [reply, setReply] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (open) void loadSupport(); }, [loadSupport, open]);
  const openTicket = async (ticket: SupportTicket) => { setView("detail"); setSelected(ticket); setSelected(await loadSupportTicket(ticket.ticketId)); };
  const create = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { const ticket = await createSupportTicket(Number(topicId), text); setSelected(ticket); setText(""); setTopicId(""); setView("detail"); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to create support ticket."); } finally { setSaving(false); } };
  const sendReply = async (event: FormEvent) => { event.preventDefault(); if (!selected) return; setSaving(true); try { setSelected(await replyToTicket(selected.ticketId, reply)); setReply(""); } finally { setSaving(false); } };
  const back = () => { setView("list"); setSelected(null); setError(""); };
  return <div className="support-widget">
    {open && <section className="support-window" aria-label="Support"><header><div><strong>LisTix Support</strong><small>{view === "list" ? "Your support tickets" : view === "create" ? "Create ticket" : selected?.ticketId}</small></div><button className="icon-button" type="button" aria-label="Close support" onClick={() => setOpen(false)}>x</button></header>
      {view === "list" && <div className="support-body"><button className="primary-button support-create-button" type="button" onClick={() => setView("create")}>New support ticket</button><div className="support-ticket-list">{supportTickets?.map((ticket) => <button key={ticket.id} type="button" onClick={() => void openTicket(ticket)}><span><strong>{ticket.topic}</strong><small>{ticket.ticketId} · {formatDate(ticket.createdAt)}</small></span><StatusBadge status={ticket.status} /></button>)}{supportTickets?.length === 0 && <p className="muted support-empty">No support tickets yet.</p>}</div></div>}
      {view === "create" && <form className="support-body support-form" onSubmit={create}><label className="field"><span>Topic</span><select value={topicId} onChange={(event) => setTopicId(event.target.value)} required><option value="">Select topic</option>{supportTopics?.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label><label className="field"><span>How can we help?</span><textarea rows={7} value={text} onChange={(event) => setText(event.target.value)} required /></label>{error && <p className="error-message">{error}</p>}<div className="support-actions"><button className="secondary-button" type="button" onClick={back}>Back</button><button className="primary-button" disabled={saving}>{saving ? "Creating..." : "Create ticket"}</button></div></form>}
      {view === "detail" && selected && <div className="support-body support-detail"><button className="support-back" type="button" onClick={back}>Back to tickets</button><div className="support-detail-heading"><div><strong>{selected.topic}</strong><small>{selected.ticketId}</small></div><StatusBadge status={selected.status} /></div><div className="support-messages">{selected.messages?.map((message) => <article key={message.id} className={message.authorRole === "system_admin" ? "admin-message" : "user-message"}><strong>{message.authorName}</strong><p>{message.body}</p><small>{formatDate(message.createdAt)}</small></article>)}</div>{!(["resolved", "closed"] as string[]).includes(selected.status) && <form className="support-reply" onSubmit={sendReply}><textarea rows={3} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Add a reply" required /><button className="primary-button" disabled={saving}>Send</button></form>}</div>}
    </section>}
    <button className="support-fab" type="button" aria-label="Open support" onClick={() => setOpen((value) => !value)}>?</button>
  </div>;
}
