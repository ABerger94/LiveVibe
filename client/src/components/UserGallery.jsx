import { useEffect, useState } from 'react';
import api from '../api.js';

export const UserGallery = ({ myLocation, locationError, onRetryLocation, onSelectUser, onViewProfile }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myLocation) return;

    const fetchNearby = async () => {
      try {
        const res = await api.get(`/users/nearby?lat=${myLocation.lat}&lng=${myLocation.lng}&radius=30`);
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch nearby users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNearby();
    const interval = setInterval(fetchNearby, 15000);
    return () => clearInterval(interval);
  }, [myLocation]);

  if (!myLocation) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#fff',
        gap: '14px',
        padding: '20px',
        textAlign: 'center'
      }}>
        {locationError ? (
          <>
            <div style={{ color: '#ef4444', fontSize: '14px', maxWidth: '320px' }}>
              Couldn't get your location: {locationError}
            </div>
            <div style={{ color: '#888', fontSize: '13px', maxWidth: '320px' }}>
              Check that location access is allowed for this site in your
              browser settings, then try again.
            </div>
            <button
              onClick={onRetryLocation}
              style={{ padding: '10px 20px', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500' }}
            >
              Try Again
            </button>
          </>
        ) : (
          'Getting your location...'
        )}
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: '#0f0f23', padding: '90px 20px 20px' }}>
      {loading && (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '60px' }}>Finding people nearby…</div>
      )}

      {!loading && users.length === 0 && (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '60px', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
          No one else is active nearby right now. Check back soon, or switch to the map view.
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '16px',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {users.map(user => (
          <div
            key={user.id}
            onClick={() => onViewProfile(user)}
            style={{
              background: '#1a1a2e',
              border: '1px solid #2a2a4e',
              borderRadius: '14px',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              width: '100%',
              paddingTop: '100%',
              position: 'relative',
              background: user.avatar_url
                ? `url(${user.avatar_url}) center/cover`
                : 'linear-gradient(135deg, #3b82f6 0%, #1a1a3e 100%)'
            }}>
              {!user.avatar_url && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  color: '#fff',
                  fontWeight: '700'
                }}>
                  {(user.display_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '999px'
              }}>
                {user.distance_miles?.toFixed(1)} mi
              </div>
            </div>

            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.display_name || user.username}
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>@{user.username}</div>
              <button
                onClick={(e) => { e.stopPropagation(); onSelectUser(user); }}
                style={{
                  width: '100%',
                  padding: '7px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                Message
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
