import { useState, useEffect, useRef } from 'react';
import '../styles/LiveChat.css';

export default function LiveChat({ companySlug, isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'support',
      text: 'Hello! How can we help you today? 👋',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate getting a response from support
    // In a real implementation, this would send to backend via WebSocket or API
    setTimeout(() => {
      const supportResponse = {
        id: messages.length + 2,
        sender: 'support',
        text: 'Thanks for your message! Our team will get back to you shortly. 📬',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, supportResponse]);
      setIsLoading(false);
    }, 1000);
  };

  if (!isOpen) return null;

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
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              <div className="message-content">
                <p className="message-text">{msg.text}</p>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}

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
          <p>We typically respond within a few minutes</p>
        </div>
      </div>
    </div>
  );
}
