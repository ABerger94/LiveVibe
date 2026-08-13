import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// A single socket.io connection shared by the whole app. Previously every
// component that called useSocket() opened its own independent connection
// (MainApp for the status indicator, ChatWindow for sending/receiving) —
// each authenticated separately, so it was never clear which connection was
// actually the one joined to your message room, and messages could go
// through one socket while events were listened for on another.
export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    socketRef.current = socket;

    const token = localStorage.getItem('token');
    if (token) socket.emit('authenticate', token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    // Surfaced so "Live" actually means "authenticated", not just
    // "transport connected" — a bad/expired token still connects the
    // socket, it just never joins the room that messages get routed to.
    socket.on('error', (message) => setAuthError(message));

    return () => socket.disconnect();
  }, []);

  const authenticate = (token) => {
    setAuthError(null);
    socketRef.current?.emit('authenticate', token);
  };

  const sendMessage = (recipientId, content) => {
    socketRef.current?.emit('send_message', { recipientId, content });
  };

  const sendTyping = (recipientId) => {
    socketRef.current?.emit('typing', { recipientId });
  };

  const onMessage = (callback) => {
    socketRef.current?.on('new_message', callback);
    return () => socketRef.current?.off('new_message', callback);
  };

  return (
    <SocketContext.Provider value={{ connected, authError, authenticate, sendMessage, sendTyping, onMessage }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
};
