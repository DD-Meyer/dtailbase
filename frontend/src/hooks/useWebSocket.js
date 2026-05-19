import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing WebSocket connections
 * Handles reconnection, message parsing, and callbacks
 */
export const useWebSocket = (url, options = {}) => {
  const ws = useRef(null);
  const reconnectInterval = useRef(null);
  const shouldReconnect = useRef(true);
  const messageHandlers = useRef({});

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('[WebSocket] Connected to', url);
        if (options.onOpen) options.onOpen();
        // Clear reconnect timer on successful connection
        if (reconnectInterval.current) {
          clearInterval(reconnectInterval.current);
          reconnectInterval.current = null;
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;

          // Call type-specific handler if registered
          if (messageHandlers.current[type]) {
            messageHandlers.current[type](data);
          }

          // Call generic handler
          if (options.onMessage) {
            options.onMessage(data);
          }
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', e);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        if (options.onError) options.onError(error);
      };

      ws.current.onclose = () => {
        console.log('[WebSocket] Connection closed');
        if (options.onClose) options.onClose();

        // Attempt to reconnect if enabled
        if (shouldReconnect.current && !reconnectInterval.current) {
          reconnectInterval.current = setInterval(() => {
            console.log('[WebSocket] Attempting to reconnect...');
            connect();
          }, options.reconnectInterval || 3000);
        }
      };
    } catch (e) {
      console.error('[WebSocket] Connection error:', e);
    }
  }, [url, options]);

  const send = useCallback((data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Connection not ready');
    }
  }, []);

  const subscribe = useCallback((messageType, handler) => {
    messageHandlers.current[messageType] = handler;
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    if (reconnectInterval.current) {
      clearInterval(reconnectInterval.current);
    }
    if (ws.current) {
      ws.current.close();
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    send,
    subscribe,
    disconnect,
    isConnected: ws.current?.readyState === WebSocket.OPEN,
  };
};
