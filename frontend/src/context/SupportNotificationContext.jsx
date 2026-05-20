import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { getAccessToken } from "../utils/authStorage";

const SupportNotificationContext = createContext({
  unreadCount: 0,
  markSupportRead: () => {},
});

const PLATFORM_COMPANIES = new Set(["Platform Admin", "DtailBase"]);

const buildWebSocketUrl = () => {
  const token = getAccessToken();
  if (!token) return null;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
};

export function SupportNotificationProvider({ children }) {
  const { user, isAuthenticated } = useContext(AuthContext);
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const cancelledRef = useRef(false);

  const isPlatformAdmin =
    !!user && (user.is_superuser || user.is_staff) && PLATFORM_COMPANIES.has(user?.company?.name);

  const markSupportRead = useCallback(() => setUnreadCount(0), []);

  // Auto-clear when the user is on the support page
  useEffect(() => {
    if (location.pathname === "/support") {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return undefined;
    }

    cancelledRef.current = false;
    let socket;
    let reconnectTimer;

    const connect = () => {
      const url = buildWebSocketUrl();
      if (!url) return;
      socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "support_message") {
            // For non-admins, only count admin replies as "new for me"
            // For platform admins, count customer-originating messages
            const incomingIsAdminReply = !!data.is_admin_reply;
            const shouldCount = isPlatformAdmin ? !incomingIsAdminReply : incomingIsAdminReply;
            if (!shouldCount) return;
            if (window.location.pathname === "/support") return;
            setUnreadCount((prev) => prev + 1);
          } else if (data.type === "support_ticket_created" && isPlatformAdmin) {
            if (window.location.pathname === "/support") return;
            setUnreadCount((prev) => prev + 1);
          }
        } catch {
          // ignore
        }
      };

      socket.onclose = () => {
        if (cancelledRef.current) return;
        reconnectTimer = window.setTimeout(connect, 4000);
      };
    };

    connect();

    return () => {
      cancelledRef.current = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (socket) socket.close();
      wsRef.current = null;
    };
  }, [isAuthenticated, isPlatformAdmin]);

  return (
    <SupportNotificationContext.Provider value={{ unreadCount, markSupportRead }}>
      {children}
    </SupportNotificationContext.Provider>
  );
}

export function useSupportNotifications() {
  return useContext(SupportNotificationContext);
}

export default SupportNotificationContext;
