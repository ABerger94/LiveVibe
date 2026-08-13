import { useState, useEffect } from 'react';
import api from '../api.js';

const formatTime = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const Inbox = ({ onClose, onSelectConversation, refreshKey }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/messages');
        setConversations(res.data);
      } catch (err) {
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20000,
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a2e',
        borderRadius: '16px',
        color: '#fff',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid #2a2a4e'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #2a2a4e'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Messages</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#888', padding: '30px 0' }}>Loading…</div>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', color: '#ef4444', padding: '30px 24px', fontSize: '13px' }}>{error}</div>
          )}

          {!loading && !error && conversations.length === 0 && (
            <div style={{ textAlign: 'center', color: '#888', padding: '40px 24px', fontSize: '14px' }}>
              No conversations yet. Message someone from the map to get started.
            </div>
          )}

          {conversations.map(conv => (
            <div
              key={conv.conversation_id}
              onClick={() => onSelectConversation({
                id: conv.user_id,
                username: conv.username,
                display_name: conv.display_name,
                avatar_url: conv.avatar_url
              })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 24px',
                cursor: 'pointer',
                borderBottom: '1px solid #22223a'
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: conv.avatar_url ? `url(${conv.avatar_url}) center/cover` : '#2a2a4e',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                {!conv.avatar_url && (conv.display_name?.[0]?.toUpperCase() || conv.username?.[0]?.toUpperCase() || '?')}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                  <strong style={{ fontSize: '14px', fontWeight: conv.unread_count > 0 ? '700' : '500' }}>
                    {conv.display_name || conv.username}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#666', flexShrink: 0 }}>
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                <p style={{
                  margin: '2px 0 0',
                  fontSize: '13px',
                  color: conv.unread_count > 0 ? '#ddd' : '#888',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {conv.last_message || 'Say hello 👋'}
                </p>
              </div>

              {conv.unread_count > 0 && (
                <span style={{
                  background: '#3b82f6',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '700',
                  minWidth: '20px',
                  height: '20px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 6px',
                  flexShrink: 0
                }}>
                  {conv.unread_count}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
