import { useState, useEffect } from 'react';
import api from '../api.js';
import { PhotoGallery } from './PhotoGallery.jsx';

export const ProfileViewer = ({ user, onClose, onMessage }) => {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (!user) return;
    setPhotos([]);
    api.get(`/users/${user.id}/photos`)
      .then(res => setPhotos(res.data))
      .catch(() => {});
  }, [user?.id]);

  if (!user) return null;

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
        maxWidth: '440px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#1a1a2e',
        borderRadius: '16px',
        color: '#fff',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid #2a2a4e'
      }}>
        <div style={{ position: 'relative' }}>
          {photos.length > 0 ? (
            <div style={{ borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
              <PhotoGallery photos={photos} height="clamp(320px, 60vh, 560px)" />
            </div>
          ) : (
            <div style={{
              height: 'clamp(220px, 40vh, 360px)',
              background: user.avatar_url
                ? `url(${user.avatar_url}) center/cover`
                : 'linear-gradient(135deg, #3b82f6 0%, #1a1a3e 100%)',
              borderRadius: '16px 16px 0 0'
            }} />
          )}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              color: '#fff',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: user.avatar_url ? `url(${user.avatar_url}) center/cover` : '#2a2a4e',
            border: '4px solid #1a1a2e',
            position: 'absolute',
            bottom: '-42px',
            left: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px'
          }}>
            {!user.avatar_url && (user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?')}
          </div>
        </div>

        <div style={{ padding: '52px 24px 24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{user.display_name || user.username}</h2>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '2px' }}>@{user.username}</p>

          {user.city && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#888' }}>
              <span>{user.city}</span>
            </div>
          )}

          {user.bio && (
            <p style={{ marginTop: '16px', fontSize: '14px', lineHeight: '1.5', color: '#ddd' }}>{user.bio}</p>
          )}

          {user.interests?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
              {user.interests.map((interest, i) => (
                <span key={i} style={{
                  background: 'rgba(59,130,246,0.15)',
                  color: '#3b82f6',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px'
                }}>
                  {interest}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => onMessage(user)}
            style={{
              width: '100%',
              marginTop: '22px',
              padding: '13px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Message
          </button>
        </div>
      </div>
    </div>
  );
};
