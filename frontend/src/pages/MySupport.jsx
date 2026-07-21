import { useContext, useEffect, useMemo, useRef, useState } from "react";

import "../styles/Global.css";
import { AuthContext } from "../context/AuthContext";
import { getAccessToken } from "../utils/authStorage";
import { showToast } from "../utils/uiFeedback";
import {
  createSupportTicket,
  fetchMySupportTickets,
  fetchSupportTicketMessages,
  sendSupportTicketMessage,
} from "../services/supportService";

const buildWebSocketUrl = () => {
  const token = getAccessToken();
  if (!token) return null;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
};

function MySupport() {
  const { user } = useContext(AuthContext);
  const currentUserId = user?.id ?? user?.user_id ?? null;
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const wsRef = useRef(null);
  const activeTicketIdRef = useRef(null);

  useEffect(() => {
    activeTicketIdRef.current = activeTicket?.id || null;
  }, [activeTicket]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchMySupportTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load your support tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const openTicket = async (ticket) => {
    setActiveTicket(ticket);
    try {
      const data = await fetchSupportTicketMessages(ticket.id);
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    }
  };

  const handleSendReply = async (event) => {
    event.preventDefault();
    const text = replyText.trim();
    if (!text || !activeTicket) return;
    try {
      setSending(true);
      await sendSupportTicketMessage(activeTicket.id, text);
      setReplyText("");
      const data = await fetchSupportTicketMessages(activeTicket.id);
      setMessages(Array.isArray(data) ? data : []);
    } finally {
      setSending(false);
    }
  };

  const handleCreateTicket = async (event) => {
    event.preventDefault();
    const subject = newSubject.trim();
    const message = newMessage.trim();
    if (!subject) return;
    try {
      setCreating(true);
      const created = await createSupportTicket({ subject, message });
      setNewSubject("");
      setNewMessage("");
      await loadTickets();
      if (created?.id) {
        await openTicket(created);
      }
      showToast("Ticket submitted. We'll be in touch shortly.", "success");
    } catch (err) {
      showToast(err?.response?.data?.detail || "Unable to submit ticket right now.", "error");
    } finally {
      setCreating(false);
    }
  };

  // Live updates via WebSocket
  useEffect(() => {
    const url = buildWebSocketUrl();
    if (!url) return undefined;

    let socket;
    let cancelled = false;

    const connect = () => {
      socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "support_message") {
            // Refresh ticket list to update statuses / ordering
            loadTickets();
            // If this message belongs to the open thread, append it live
            if (
              activeTicketIdRef.current &&
              String(data.ticket_id) === String(activeTicketIdRef.current)
            ) {
              const refreshed = await fetchSupportTicketMessages(activeTicketIdRef.current);
              setMessages(Array.isArray(refreshed) ? refreshed : []);
            } else if (data.is_admin_reply) {
              showToast(`Support replied on "${data.ticket_subject}"`, "info");
            }
          } else if (data.type === "support_ticket_created") {
            loadTickets();
          }
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        // Lightweight reconnect
        window.setTimeout(connect, 4000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (socket) socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const order = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 3 };
      const left = order[a.status] ?? 9;
      const right = order[b.status] ?? 9;
      if (left !== right) return left - right;
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });
  }, [tickets]);

  return (
    <div className="page-body">
      <div className="card">
        <h1 className="text-2xl font-bold">My Support</h1>
        <p className="text-muted mt-2">
          Your support tickets and live chat with the DtailBase team. Conversations are saved here even after you log out.
        </p>
        {error && <p style={{ color: "#fca5a5", marginTop: "8px" }}>{error}</p>}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 className="text-lg font-semibold">Open a new ticket</h2>
        <form onSubmit={handleCreateTicket} style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
          <input
            type="text"
            value={newSubject}
            onChange={(event) => setNewSubject(event.target.value)}
            placeholder="Subject"
            required
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(123, 154, 196, 0.28)",
              padding: "10px",
              color: "white",
              borderRadius: "8px",
            }}
          />
          <textarea
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder="Describe how we can help..."
            rows={4}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(123, 154, 196, 0.28)",
              padding: "10px",
              color: "white",
              borderRadius: "8px",
              resize: "vertical",
            }}
          />
          <div>
            <button type="submit" className="btn-main" disabled={creating || !newSubject.trim()}>
              {creating ? "Submitting..." : "Submit ticket"}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 className="text-lg font-semibold">Your tickets</h2>
        {loading ? (
          <p className="text-muted mt-2">Loading...</p>
        ) : sortedTickets.length === 0 ? (
          <p className="text-muted mt-2">No tickets yet. Open one above and we'll respond as soon as possible.</p>
        ) : (
          <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
            {sortedTickets.map((ticket) => {
              const isActive = activeTicket?.id === ticket.id;
              return (
                <button
                  type="button"
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  style={{
                    textAlign: "left",
                    width: "100%",
                    border: isActive
                      ? "1px solid rgba(56, 189, 248, 0.7)"
                      : "1px solid rgba(123, 154, 196, 0.28)",
                    background: isActive ? "rgba(56, 189, 248, 0.18)" : "rgba(15, 26, 43, 0.6)",
                    color: "#eaf3ff",
                    borderRadius: "8px",
                    padding: "10px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                    <strong>{ticket.subject}</strong>
                    <small>{ticket.status}</small>
                  </div>
                  <small style={{ color: "#cbd5f5" }}>
                    Lane: {ticket.support_lane} • Updated {new Date(ticket.updated_at).toLocaleString()}
                  </small>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 className="text-lg font-semibold">Chat Room</h2>
        {!activeTicket ? (
          <p className="text-muted mt-2">Select a ticket above to view the conversation.</p>
        ) : (
          <>
            <div style={{ marginTop: "10px", marginBottom: "10px" }}>
              <strong>{activeTicket.subject}</strong>
              <p className="text-muted">Status: {activeTicket.status} • {activeTicket.support_lane}</p>
            </div>
            <div
              style={{
                border: "1px solid rgba(123, 154, 196, 0.28)",
                borderRadius: "10px",
                padding: "12px",
                maxHeight: "360px",
                overflowY: "auto",
              }}
            >
              {messages.length === 0 ? (
                <p className="text-muted">No messages yet.</p>
              ) : (
                messages.map((row) => {
                  const mine = currentUserId && String(row.sender) === String(currentUserId);
                  return (
                    <div
                      key={row.id}
                      style={{
                        marginBottom: "8px",
                        padding: "10px",
                        borderRadius: "8px",
                        background: row.is_admin_reply
                          ? "rgba(56, 189, 248, 0.22)"
                          : mine
                            ? "rgba(34, 197, 94, 0.18)"
                            : "rgba(148, 163, 184, 0.2)",
                        color: "#eaf3ff",
                      }}
                    >
                      <p style={{ margin: 0 }}>{row.message}</p>
                      <small style={{ color: "#cbd5f5" }}>
                        {row.is_admin_reply ? "DtailBase support" : row.sender_email || "You"} •
                        {" "}
                        {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                      </small>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={handleSendReply} style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <input
                type="text"
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Type a reply..."
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(123, 154, 196, 0.28)",
                  padding: "10px",
                  color: "white",
                  borderRadius: "8px",
                }}
              />
              <button type="submit" className="btn-main" disabled={sending || !replyText.trim()}>
                {sending ? "Sending" : "Send"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default MySupport;
