import { useEffect, useMemo, useState } from "react";

import "../styles/Global.css";
import {
  fetchAdminSupportInbox,
  fetchSupportTicketMessages,
  sendSupportTicketMessage,
  updateSupportTicketStatus,
} from "../services/supportService";

function SupportAdminInbox() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lanes, setLanes] = useState({ priority_lane: [], standard_lane: [] });
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const loadInbox = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAdminSupportInbox();
      setLanes(data || { priority_lane: [], standard_lane: [] });
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load support inbox.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const allTicketRows = useMemo(() => {
    const mapLane = (laneName, companies) =>
      companies.flatMap((company) =>
        (company.tickets || []).map((ticket) => ({
          ...ticket,
          laneName,
          company_name: company.company_name,
          company_plan: company.company_plan,
        }))
      );

    const priorityRows = mapLane("PRIORITY", lanes.priority_lane || []);
    const standardRows = mapLane("STANDARD", lanes.standard_lane || []);

    return [...priorityRows, ...standardRows];
  }, [lanes]);

  const openTicketThread = async (ticket) => {
    try {
      setActiveTicket(ticket);
      const messages = await fetchSupportTicketMessages(ticket.id);
      setTicketMessages(Array.isArray(messages) ? messages : []);
    } catch {
      setTicketMessages([]);
    }
  };

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || !activeTicket) return;

    try {
      setSendingReply(true);
      await sendSupportTicketMessage(activeTicket.id, text);
      setReplyText("");
      const messages = await fetchSupportTicketMessages(activeTicket.id);
      setTicketMessages(Array.isArray(messages) ? messages : []);
      await loadInbox();
    } finally {
      setSendingReply(false);
    }
  };

  const handleSetResolved = async () => {
    if (!activeTicket) return;
    try {
      await updateSupportTicketStatus(activeTicket.id, "RESOLVED");
      await loadInbox();
      const messages = await fetchSupportTicketMessages(activeTicket.id);
      setTicketMessages(Array.isArray(messages) ? messages : []);
    } catch {
      // Keep non-blocking if the request fails.
    }
  };

  if (loading) {
    return <div className="page-body"><div className="card">Loading support inbox...</div></div>;
  }

  return (
    <div className="page-body">
      <div className="card">
        <h1 className="text-2xl font-bold">Support Inbox</h1>
        <p className="text-muted mt-2">
          Enterprise companies appear in a dedicated priority lane. Standard lane includes Pro and Starter.
        </p>
        {error && <p className="mt-3" style={{ color: "#fca5a5" }}>{error}</p>}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 className="text-lg font-semibold">Priority Lane (Enterprise)</h2>
        {(lanes.priority_lane || []).length === 0 ? (
          <p className="text-muted mt-2">No Enterprise support tickets right now.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            {(lanes.priority_lane || []).map((company) => (
              <div key={company.company_id} style={{ border: "1px solid rgba(123, 154, 196, 0.28)", borderRadius: "10px", padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <strong>{company.company_name}</strong>
                  <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>{company.ticket_count} tickets</span>
                </div>
                <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                  {(company.tickets || []).map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => openTicketThread(ticket)}
                      style={{
                        textAlign: "left",
                        width: "100%",
                        border: "1px solid rgba(123, 154, 196, 0.28)",
                        background: "rgba(15, 26, 43, 0.6)",
                        color: "#eaf3ff",
                        borderRadius: "8px",
                        padding: "10px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                        <span>{ticket.subject}</span>
                        <small>{ticket.status}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 className="text-lg font-semibold">Standard Lane</h2>
        {(lanes.standard_lane || []).length === 0 ? (
          <p className="text-muted mt-2">No standard lane tickets.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            {(lanes.standard_lane || []).map((company) => (
              <div key={company.company_id} style={{ border: "1px solid rgba(123, 154, 196, 0.28)", borderRadius: "10px", padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <strong>{company.company_name}</strong>
                  <span className="badge" style={{ background: "#dbeafe", color: "#1e3a8a" }}>{company.ticket_count} tickets</span>
                </div>
                <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                  {(company.tickets || []).map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => openTicketThread(ticket)}
                      style={{
                        textAlign: "left",
                        width: "100%",
                        border: "1px solid rgba(123, 154, 196, 0.28)",
                        background: "rgba(15, 26, 43, 0.6)",
                        color: "#eaf3ff",
                        borderRadius: "8px",
                        padding: "10px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                        <span>{ticket.subject}</span>
                        <small>{ticket.status}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 className="text-lg font-semibold">Ticket Thread</h2>
        {!activeTicket ? (
          <p className="text-muted mt-2">Select a ticket to view and reply.</p>
        ) : (
          <>
            <div style={{ marginTop: "10px", marginBottom: "10px" }}>
              <strong>{activeTicket.subject}</strong>
              <p className="text-muted">{activeTicket.company_name} • {activeTicket.company_plan}</p>
            </div>
            <div style={{ border: "1px solid rgba(123, 154, 196, 0.28)", borderRadius: "10px", padding: "12px", maxHeight: "320px", overflowY: "auto" }}>
              {ticketMessages.length === 0 ? (
                <p className="text-muted">No messages yet.</p>
              ) : (
                ticketMessages.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      marginBottom: "8px",
                      padding: "8px",
                      borderRadius: "8px",
                      background: row.is_admin_reply ? "rgba(56, 189, 248, 0.22)" : "rgba(148, 163, 184, 0.2)",
                    }}
                  >
                    <p>{row.message}</p>
                    <small className="text-muted">{row.sender_email || "Unknown"}</small>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <input
                type="text"
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Reply to this ticket..."
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(123, 154, 196, 0.28)",
                  padding: "10px",
                  color: "white",
                  borderRadius: "8px",
                }}
              />
              <button type="button" className="btn-main" onClick={handleSendReply} disabled={sendingReply}>
                {sendingReply ? "Sending" : "Send"}
              </button>
            </div>
            <div style={{ marginTop: "10px" }}>
              <button type="button" className="btn-secondary" onClick={handleSetResolved}>
                Mark Resolved
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3 className="text-lg font-semibold">Quick Stats</h3>
        <p className="text-muted mt-2">Total open threads across all lanes: {allTicketRows.length}</p>
      </div>
    </div>
  );
}

export default SupportAdminInbox;
