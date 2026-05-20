import { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/LiveChat.css';
import {
  createSupportTicket,
  fetchMySupportTickets,
  fetchSupportTicketMessages,
  sendSupportTicketMessage,
} from '../services/supportService';
import { getAccessToken } from '../utils/authStorage';

const LIVE_CHAT_SUBJECT = 'Live Chat';

const buildWebSocketUrl = () => {
  const token = getAccessToken();
  if (!token) return null;
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
};

const pickActiveLiveChatTicket = (tickets) => {
  if (!Array.isArray(tickets) || tickets.length === 0) return null;
  // Prefer an open Live Chat ticket; fall back to the most recently updated open ticket.
  const live = tickets
    .filter((t) => (t.status === 'OPEN' || t.status === 'IN_PROGRESS') && t.subject === LIVE_CHAT_SUBJECT)
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0];
  if (live) return live;
  const anyOpen = tickets
    .filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0];
  return anyOpen || null;
};

export default function LiveChat({ isOpen, onClose }) {
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const activeTicketIdRef = useRef(null);

  useEffect(() => {
    activeTicketIdRef.current = activeTicket?.id || null;
  }, [activeTicket]);

  // Hydrate active ticket + messages whenever the panel opens
  const hydrate = useCallback(async () => {
    setIsHydrating(true);
    setError('');
    try {
      const tickets = await fetchMySupportTickets();
      const ticket = pickActiveLiveChatTicket(tickets);
      if (ticket) {
        setActiveTicket(ticket);
        const msgs = await fetchSupportTicketMessages(ticket.id);
        setMessages(Array.isArray(msgs) ? msgs : []);
      } else {
        setActiveTicket(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load chat history.');
    } finally {
      setIsHydrating(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    hydrate();
  }, [isOpen, hydrate]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Live updates via the shared notifications WebSocket
  useEffect(() => {
    if (!isOpen) return undefined;
    const url = buildWebSocketUrl();
    if (!url) return undefined;

    let socket;
    let cancelled = false;

    const connect = () => {
      socket = new WebSocket(url);
      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'support_message') {
            const ticketId = activeTicketIdRef.current;
            if (ticketId && String(data.ticket_id) === String(ticketId)) {
              const refreshed = await fetchSupportTicketMessages(ticketId);
              setMessages(Array.isArray(refreshed) ? refreshed : []);
            }
          }
        } catch {
          // ignore malformed payloads
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
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setError('');
    try {
      if (activeTicket?.id) {
        await sendSupportTicketMessage(activeTicket.id, text);
        const refreshed = await fetchSupportTicketMessages(activeTicket.id);
        setMessages(Array.isArray(refreshed) ? refreshed : []);
      } else {
        const created = await createSupportTicket({ subject: LIVE_CHAT_SUBJECT, message: text });
        if (created?.id) {
          setActiveTicket(created);
          const refreshed = await fetchSupportTicketMessages(created.id);
          setMessages(Array.isArray(refreshed) ? refreshed : []);
        }
      }
      setInputValue('');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderMessages = () => {
    if (isHydrating) {
      return (
        <div className="message support">
          <div className="message-content">
            <p className="message-text">Loading conversation...</p>
          </div>
        </div>
      );
    }
    if (messages.length === 0) {
      return (
        <div className="message support">
          <div className="message-content">
            <p className="message-text">Hello! How can we help you today? 👋</p>
          </div>
        </div>
      );
    }
    return messages.map((msg) => {
      const sender = msg.is_admin_reply ? 'support' : 'user';
      const ts = msg.created_at ? new Date(msg.created_at) : new Date();
      return (
        <div key={msg.id} className={`message ${sender}`}>
          <div className="message-content">
            <p className="message-text">{msg.message}</p>
            <span className="message-time">
              {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="live-chat-container">
      <div className="live-chat-window">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-title">
            <div className="online-indicator"></div>
            <h3>Chat with us</h3>
          </div>
          <button className="chat-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {renderMessages()}

          {isLoading && (
            <div className="message support typing">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="chat-error" style={{ padding: '6px 12px', color: '#b91c1c', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Input */}
        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!inputValue.trim() || isLoading}
          >
            <span>Send</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 2l16 8-16 8V2z" />
            </svg>
          </button>
        </form>

        {/* Footer */}
        <div className="chat-footer">
          <p>Premium priority support — our technicians reply in real time.</p>
        </div>
      </div>
    </div>
  );
}
