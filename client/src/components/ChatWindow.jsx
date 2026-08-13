import { useState, useEffect, useRef } from 'react';
import api from '../api.js';
import { useSocket } from '../hooks/useSocket.js';

export const ChatWindow = ({ user, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const { sendMessage, onMessage } = useSocket();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/${user.id}`);
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    fetchMessages();
  }, [user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unsubscribe = onMessage((msg) => {
      if (msg.senderId === user.id) {
        setMessages(prev => [...prev, { sender_id: user.id, content: msg.content, created_at: msg.createdAt }]);
      }
    });
    return unsubscribe;
  }, [user.id, onMessage]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setError(null);

    try {
      await api.post(`/messages/${user.id}`, { content: input });
      sendMessage(user.id, input);
      setMessages(prev => [...prev, {
        sender_id: 'me',
        content: input,
        created_at: new Date().toISOString()
      }]);
      setInput('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send');
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: '20px',
      width: '360px',
      height: '480px',
      background: '#1a1a2e',
      color: '#fff',
      borderRadius: '12px 12px 0 0',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
      zIndex: 10000,
      border: '1px solid #2a2a4e'
    }}>
      <div style={{ 
        padding: '14px 16px', 
        borderBottom: '1px solid #2a2a4e', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#151528',
        borderRadius: '12px 12px 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt=""
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
          <div>
            <strong>@{user.username}</strong>
            {user.display_name && (
              <div style={{ fontSize: '12px', color: '#888' }}>{user.display_name}</div>
            )}
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', marginTop: '40px', fontSize: '14px' }}>
            Send a message to start the conversation.<br/>
            <span style={{ fontSize: '12px' }}>You have 3 free messages per day for new people.</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.sender_id === 'me' ? 'flex-end' : 'flex-start',
            background: msg.sender_id === 'me' ? '#3b82f6' : '#2a2a4e',
            padding: '10px 14px',
            borderRadius: msg.sender_id === 'me' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            maxWidth: '75%',
            fontSize: '14px',
            lineHeight: '1.4'
          }}>
            {msg.content}
            <div style={{ fontSize: '10px', color: msg.sender_id === 'me' ? 'rgba(255,255,255,0.6)' : '#666', marginTop: '4px', textAlign: 'right' }}>
              {formatTime(msg.created_at)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{ color: '#ef4444', padding: '8px 16px', fontSize: '12px', background: 'rgba(239,68,68,0.1)' }}>
          {error}
        </div>
      )}

      <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', borderTop: '1px solid #2a2a4e' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={{ 
            flex: 1, 
            padding: '10px 14px', 
            borderRadius: '20px', 
            border: '1px solid #2a2a4e',
            background: '#0f0f23',
            color: '#fff',
            outline: 'none',
            fontSize: '14px'
          }}
        />
        <button 
          onClick={handleSend} 
          style={{ 
            padding: '10px 20px', 
            borderRadius: '20px', 
            background: '#3b82f6', 
            color: '#fff', 
            border: 'none',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};
