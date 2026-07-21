import { useContext, useEffect, useMemo, useRef, useState } from "react";

import "../styles/Global.css";
import { AuthContext } from "../context/AuthContext";
import { useSupportNotifications } from "../context/SupportNotificationContext";
import { getAccessToken } from "../utils/authStorage";
import { showToast } from "../utils/uiFeedback";
import {
  claimSupportTicket,
  fetchAdminSupportInbox,
  fetchAdminSupportOverview,
  fetchSupportTicketMessages,
  releaseSupportTicket,
  sendSupportTicketMessage,
  updateSupportTicketStatus,
} from "../services/supportService";

const buildWebSocketUrl = () => {
  const token = getAccessToken();
  if (!token) return null;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
};

function SupportAdminInbox() {
  const { user } = useContext(AuthContext);
  const supportNotifications = useSupportNotifications();
  const currentUserId = user?.id ?? user?.user_id ?? null;
  const currentUserEmail = user?.email || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lanes, setLanes] = useState({ priority_lane: [], standard_lane: [] });
  const [notifications, setNotifications] = useState([]);
  const [chatRoomFeed, setChatRoomFeed] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [claimBusyId, setClaimBusyId] = useState(null);
  const [claimError, setClaimError] = useState("");
  const [notificationsCollapsed, setNotificationsCollapsed] = useState(true);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterLane, setFilterLane] = useState("ALL");
  const [filterAttendance, setFilterAttendance] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  const loadInbox = async () => {
    try {
      setLoading(true);
      setError("");
      const [inboxData, overviewData] = await Promise.all([
        fetchAdminSupportInbox(),
        fetchAdminSupportOverview(),
      ]);
      setLanes(inboxData || { priority_lane: [], standard_lane: [] });
      setNotifications(Array.isArray(overviewData?.notifications) ? overviewData.notifications : []);
      setChatRoomFeed(Array.isArray(overviewData?.chat_room) ? overviewData.chat_room : []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load support inbox.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (rawValue) => {
    if (!rawValue) return "";
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString();
  };

  useEffect(() => {
    loadInbox();
  }, []);

  // Live WebSocket updates for support events
  const activeTicketIdRef = useRef(null);
  useEffect(() => {
    activeTicketIdRef.current = activeTicket?.id || null;
  }, [activeTicket]);

  useEffect(() => {
    const url = buildWebSocketUrl();
    if (!url) return undefined;

    let socket;
    let cancelled = false;

    const connect = () => {
      socket = new WebSocket(url);

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "support_message") {
            loadInbox();
            if (
              activeTicketIdRef.current &&
              String(data.ticket_id) === String(activeTicketIdRef.current)
            ) {
              const refreshed = await fetchSupportTicketMessages(activeTicketIdRef.current);
              setTicketMessages(Array.isArray(refreshed) ? refreshed : []);
            } else if (!data.is_admin_reply) {
              showToast(`New message from ${data.company_name}: ${data.ticket_subject}`, "info");
            }
          } else if (data.type === "support_ticket_created") {
            loadInbox();
            showToast(`New ticket from ${data.company_name}: ${data.ticket_subject}`, "info");
          }
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
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

  const isAttendedByMe = (row) => {
    if (!row?.assigned_to_id) return false;
    if (currentUserId && String(row.assigned_to_id) === String(currentUserId)) return true;
    return Boolean(currentUserEmail) && row.assigned_to_email === currentUserEmail;
  };

  const matchesSearchText = (haystackParts) => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return true;
    return haystackParts
      .filter(Boolean)
      .some((part) => String(part).toLowerCase().includes(q));
  };

  const matchesAttendance = (row) => {
    if (filterAttendance === "ALL") return true;
    if (filterAttendance === "MINE") return isAttendedByMe(row);
    if (filterAttendance === "UNATTENDED") return !row?.assigned_to_id;
    if (filterAttendance === "OTHERS") return Boolean(row?.assigned_to_id) && !isAttendedByMe(row);
    return true;
  };

  const isLiveChatSubject = (subject) => String(subject || "").trim().toLowerCase() === "live chat";

  const matchesType = (subject) => {
    if (filterType === "ALL") return true;
    if (filterType === "LIVE_CHAT") return isLiveChatSubject(subject);
    if (filterType === "TICKETS") return !isLiveChatSubject(subject);
    return true;
  };

  const filteredChatRoomFeed = useMemo(() => {
    return chatRoomFeed.filter((row) => {
      if (!matchesType(row.ticket_subject)) return false;
      if (filterStatus !== "ALL" && row.ticket_status !== filterStatus) return false;
      if (filterLane !== "ALL" && row.support_lane !== filterLane) return false;
      if (!matchesAttendance(row)) return false;
      if (!matchesSearchText([row.company_name, row.ticket_subject, row.last_message, row.last_sender_email])) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRoomFeed, filterType, filterStatus, filterLane, filterAttendance, filterSearch, currentUserId, currentUserEmail]);

  const filterCompanyTickets = (companies) =>
    companies
      .map((company) => {
        const tickets = (company.tickets || []).filter((ticket) => {
          if (!matchesType(ticket.subject)) return false;
          if (filterStatus !== "ALL" && ticket.status !== filterStatus) return false;
          if (!matchesAttendance(ticket)) return false;
          if (!matchesSearchText([company.company_name, ticket.subject])) return false;
          return true;
        });
        return { ...company, tickets, ticket_count: tickets.length };
      })
      .filter((company) => company.tickets.length > 0);

  const filteredPriorityLane = useMemo(
    () => (filterLane === "STANDARD" ? [] : filterCompanyTickets(lanes.priority_lane || [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lanes, filterType, filterStatus, filterLane, filterAttendance, filterSearch, currentUserId, currentUserEmail]
  );

  const filteredStandardLane = useMemo(
    () => (filterLane === "PRIORITY" ? [] : filterCompanyTickets(lanes.standard_lane || [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lanes, filterType, filterStatus, filterLane, filterAttendance, filterSearch, currentUserId, currentUserEmail]
  );

  const resetFilters = () => {
    setFilterSearch("");
    setFilterStatus("ALL");
    setFilterLane("ALL");
    setFilterAttendance("ALL");
    setFilterType("ALL");
  };

  const handleMarkNotificationsRead = () => {
    setNotifications([]);
    if (supportNotifications?.markSupportRead) {
      supportNotifications.markSupportRead();
    }
  };

  const attendanceLabel = (row) => {
    if (!row?.assigned_to_email) return "Unattended";
    if (isAttendedByMe(row)) return "Attending (you)";
    return `Attended by ${row.assigned_to_username || row.assigned_to_email}`;
  };

  const handleClaim = async (ticketId) => {
    setClaimError("");
    setClaimBusyId(ticketId);
    try {
      await claimSupportTicket(ticketId);
      await loadInbox();
      if (activeTicket?.id === ticketId) {
        const refreshed = await fetchSupportTicketMessages(ticketId);
        setTicketMessages(Array.isArray(refreshed) ? refreshed : []);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || "Unable to claim this ticket.";
      const who = err?.response?.data?.assigned_to_email;
      setClaimError(who ? `${msg} (currently with ${who})` : msg);
    } finally {
      setClaimBusyId(null);
    }
  };

  const handleRelease = async (ticketId) => {
    setClaimError("");
    setClaimBusyId(ticketId);
    try {
      await releaseSupportTicket(ticketId);
      await loadInbox();
    } catch (err) {
      setClaimError(err?.response?.data?.detail || "Unable to release this ticket.");
    } finally {
      setClaimBusyId(null);
    }
  };

  if (loading) {
    return <div className="page-body"><div className="card">Loading support inbox...</div></div>;
  }

  return (
    <div className="page-body">
      <div className="card">
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-muted mt-2">
          Hidden admin-only command center. Enterprise companies appear in a dedicated priority lane.
        </p>
        {error && <p className="mt-3" style={{ color: "#fca5a5" }}>{error}</p>}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setNotificationsCollapsed((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flex: 1,
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 0,
            }}
            aria-expanded={!notificationsCollapsed}
          >
            <h2 className="text-lg font-semibold" style={{ margin: 0 }}>
              Notifications
              {notifications.length > 0 && (
                <span
                  style={{
                    marginLeft: "8px",
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: "9px",
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {notifications.length}
                </span>
              )}
            </h2>
            <span aria-hidden="true" style={{ fontSize: "1.1rem", color: "#9ab2d2" }}>
              {notificationsCollapsed ? "▼" : "▲"}
            </span>
          </button>
          {notifications.length > 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleMarkNotificationsRead}
              style={{ whiteSpace: "nowrap", fontSize: "0.8rem", padding: "6px 10px" }}
            >
              Mark as read
            </button>
          )}
        </div>
        {!notificationsCollapsed && (
          notifications.length === 0 ? (
            <p className="text-muted mt-2">No recent notifications.</p>
          ) : (
            <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
              {notifications.map((row, index) => (
                <div
                  key={`${row.created_at || index}-${row.company_name || "company"}`}
                  style={{
                    border: "1px solid rgba(123, 154, 196, 0.28)",
                    borderRadius: "8px",
                    padding: "10px",
                    background: "rgba(15, 26, 43, 0.45)",
                  }}
                >
                  <strong>{row.company_name || "Company"}</strong>
                  <p style={{ marginTop: "4px" }}>{row.message}</p>
                  <small className="text-muted">{formatDate(row.created_at)}</small>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <h2 className="text-lg font-semibold" style={{ margin: 0 }}>Filters</h2>
          <button type="button" className="btn-secondary" onClick={resetFilters}>Reset</button>
        </div>
        <div
          style={{
            marginTop: "12px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
          }}
        >
          <input
            type="text"
            value={filterSearch}
            onChange={(event) => setFilterSearch(event.target.value)}
            placeholder="Search company, subject, message..."
            style={{
              gridColumn: "1 / -1",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(123, 154, 196, 0.28)",
              padding: "10px",
              color: "white",
              borderRadius: "8px",
            }}
          />
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
            style={{ background: "#ffffff", border: "1px solid rgba(123, 154, 196, 0.28)", padding: "10px", color: "#0f172a", borderRadius: "8px" }}
            aria-label="Type"
          >
            <option value="ALL">All conversations</option>
            <option value="LIVE_CHAT">Live chats only</option>
            <option value="TICKETS">Tickets only</option>
          </select>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            style={{ background: "#ffffff", border: "1px solid rgba(123, 154, 196, 0.28)", padding: "10px", color: "#0f172a", borderRadius: "8px" }}
            aria-label="Status"
          >
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            value={filterLane}
            onChange={(event) => setFilterLane(event.target.value)}
            style={{ background: "#ffffff", border: "1px solid rgba(123, 154, 196, 0.28)", padding: "10px", color: "#0f172a", borderRadius: "8px" }}
            aria-label="Lane"
          >
            <option value="ALL">All lanes</option>
            <option value="PRIORITY">Priority (Enterprise)</option>
            <option value="STANDARD">Standard</option>
          </select>
          <select
            value={filterAttendance}
            onChange={(event) => setFilterAttendance(event.target.value)}
            style={{ background: "#ffffff", border: "1px solid rgba(123, 154, 196, 0.28)", padding: "10px", color: "#0f172a", borderRadius: "8px" }}
            aria-label="Attendance"
          >
            <option value="ALL">Any attendance</option>
            <option value="MINE">Attending (me)</option>
            <option value="UNATTENDED">Unattended</option>
            <option value="OTHERS">Attended by others</option>
          </select>
        </div>
      </div>

      {filterType !== "TICKETS" && (
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 className="text-lg font-semibold">Chat Rooms</h2>
        {claimError && <p style={{ color: "#fca5a5", marginTop: "8px" }}>{claimError}</p>}
        {filteredChatRoomFeed.length === 0 ? (
          <p className="text-muted mt-2">No chat rooms match your filters.</p>
        ) : (
          <div style={{ border: "1px solid rgba(123, 154, 196, 0.28)", borderRadius: "10px", padding: "12px", maxHeight: "360px", overflowY: "auto", marginTop: "12px" }}>
            {filteredChatRoomFeed.map((row) => {
              const attendedByOther = Boolean(row.assigned_to_id) && !isAttendedByMe(row);
              return (
                <div
                  key={row.ticket_id}
                  style={{
                    marginBottom: "10px",
                    padding: "10px",
                    borderRadius: "8px",
                    background: row.support_lane === "PRIORITY" ? "rgba(56, 189, 248, 0.22)" : "rgba(148, 163, 184, 0.18)",
                    color: "#eaf3ff",
                    border: isAttendedByMe(row)
                      ? "1px solid rgba(34, 197, 94, 0.6)"
                      : attendedByOther
                        ? "1px solid rgba(251, 191, 36, 0.55)"
                        : "1px solid rgba(123, 154, 196, 0.28)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <strong>{row.company_name}</strong>
                      <span style={{ marginLeft: "8px", fontSize: "0.8rem", opacity: 0.85 }}>{row.support_lane}</span>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: isAttendedByMe(row)
                          ? "#bbf7d0"
                          : attendedByOther
                            ? "#fde68a"
                            : "#e5e7eb",
                        color: isAttendedByMe(row) ? "#065f46" : attendedByOther ? "#92400e" : "#1f2937",
                        fontWeight: 600,
                      }}
                    >
                      {attendanceLabel(row)}
                    </span>
                  </div>
                  <p style={{ marginTop: "6px", marginBottom: "6px", fontWeight: 500 }}>{row.ticket_subject}</p>
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>{row.last_message}</p>
                  <small style={{ color: "#cbd5f5" }}>{row.last_sender_email} • {formatDate(row.last_message_at)}</small>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => openTicketThread({
                        id: row.ticket_id,
                        subject: row.ticket_subject,
                        company_name: row.company_name,
                        company_plan: row.company_plan,
                        status: row.ticket_status,
                        assigned_to_id: row.assigned_to_id,
                        assigned_to_email: row.assigned_to_email,
                        assigned_to_username: row.assigned_to_username,
                      })}
                    >
                      Open thread
                    </button>
                    {isAttendedByMe(row) ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={claimBusyId === row.ticket_id}
                        onClick={() => handleRelease(row.ticket_id)}
                      >
                        {claimBusyId === row.ticket_id ? "Releasing..." : "Release"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-main"
                        disabled={claimBusyId === row.ticket_id || attendedByOther}
                        onClick={() => handleClaim(row.ticket_id)}
                        title={attendedByOther ? `Already attended by ${row.assigned_to_email}` : "Claim this chat room"}
                      >
                        {claimBusyId === row.ticket_id ? "Claiming..." : attendedByOther ? "In use" : "Claim"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {filterType !== "LIVE_CHAT" && (
      <>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 className="text-lg font-semibold">Priority Lane (Enterprise)</h2>
        {filteredPriorityLane.length === 0 ? (
          <p className="text-muted mt-2">No Enterprise tickets match your filters.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            {filteredPriorityLane.map((company) => (
              <div key={company.company_id} style={{ border: "1px solid rgba(123, 154, 196, 0.28)", borderRadius: "10px", padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <strong>{company.company_name}</strong>
                  <span className="badge ticket-count-badge" style={{ background: "#fef3c7", color: "#92400e" }}>{company.ticket_count} tickets</span>
                </div>
                <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                  {(company.tickets || []).map((ticket) => {
                    const attendedByOther = Boolean(ticket.assigned_to_id) && !isAttendedByMe(ticket);
                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => openTicketThread(ticket)}
                        style={{
                          textAlign: "left",
                          width: "100%",
                          border: isAttendedByMe(ticket)
                            ? "1px solid rgba(34, 197, 94, 0.6)"
                            : attendedByOther
                              ? "1px solid rgba(251, 191, 36, 0.55)"
                              : "1px solid rgba(123, 154, 196, 0.28)",
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
                        <small style={{ color: isAttendedByMe(ticket) ? "#bbf7d0" : attendedByOther ? "#fde68a" : "#cbd5f5" }}>
                          {attendanceLabel(ticket)}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 className="text-lg font-semibold">Standard Lane</h2>
        {filteredStandardLane.length === 0 ? (
          <p className="text-muted mt-2">No standard tickets match your filters.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            {filteredStandardLane.map((company) => (
              <div key={company.company_id} style={{ border: "1px solid rgba(123, 154, 196, 0.28)", borderRadius: "10px", padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <strong>{company.company_name}</strong>
                  <span className="badge ticket-count-badge" style={{ background: "#dbeafe", color: "#1e3a8a" }}>{company.ticket_count} tickets</span>
                </div>
                <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                  {(company.tickets || []).map((ticket) => {
                    const attendedByOther = Boolean(ticket.assigned_to_id) && !isAttendedByMe(ticket);
                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => openTicketThread(ticket)}
                        style={{
                          textAlign: "left",
                          width: "100%",
                          border: isAttendedByMe(ticket)
                            ? "1px solid rgba(34, 197, 94, 0.6)"
                            : attendedByOther
                              ? "1px solid rgba(251, 191, 36, 0.55)"
                              : "1px solid rgba(123, 154, 196, 0.28)",
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
                        <small style={{ color: isAttendedByMe(ticket) ? "#bbf7d0" : attendedByOther ? "#fde68a" : "#cbd5f5" }}>
                          {attendanceLabel(ticket)}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 className="text-lg font-semibold">Ticket Thread</h2>
        {!activeTicket ? (
          <p className="text-muted mt-2">Select a ticket to view and reply.</p>
        ) : (
          <>
            <div style={{ marginTop: "10px", marginBottom: "10px" }}>
              <strong>{activeTicket.subject}</strong>
              <p className="text-muted">{activeTicket.company_name} • {activeTicket.company_plan}</p>
              <p style={{ marginTop: "4px", color: isAttendedByMe(activeTicket) ? "#bbf7d0" : activeTicket.assigned_to_email ? "#fde68a" : "#cbd5f5" }}>
                {attendanceLabel(activeTicket)}
              </p>
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
            <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" className="btn-secondary" onClick={handleSetResolved}>
                Mark Resolved
              </button>
              {isAttendedByMe(activeTicket) ? (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={claimBusyId === activeTicket.id}
                  onClick={() => handleRelease(activeTicket.id)}
                >
                  {claimBusyId === activeTicket.id ? "Releasing..." : "Release chat room"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-main"
                  disabled={claimBusyId === activeTicket.id || (Boolean(activeTicket.assigned_to_id) && !isAttendedByMe(activeTicket))}
                  onClick={() => handleClaim(activeTicket.id)}
                  title={activeTicket.assigned_to_email && !isAttendedByMe(activeTicket) ? `Already attended by ${activeTicket.assigned_to_email}` : "Claim this chat room"}
                >
                  {claimBusyId === activeTicket.id
                    ? "Claiming..."
                    : activeTicket.assigned_to_email && !isAttendedByMe(activeTicket)
                      ? "In use"
                      : "Claim chat room"}
                </button>
              )}
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
