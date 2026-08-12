import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = () => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    socketRef.current = socket;

    const token = localStorage.getItem('token');
    if (token) {
      socket.emit('authenticate', token);
    }

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => socket.disconnect();
  }, []);

  const authenticate = (token) => {
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

  return { socket: socketRef.current, connected, authenticate, sendMessage, sendTyping, onMessage };
};
