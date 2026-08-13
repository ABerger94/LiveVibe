import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api.js';

export const NearbyMap = ({ myLocation, locationError, onRetryLocation, onSelectUser, onViewProfile }) => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!myLocation) return;

    const fetchNearby = async () => {
      try {
        const res = await api.get(`/users/nearby?lat=${myLocation.lat}&lng=${myLocation.lng}&radius=30`);
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch nearby users:', err);
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
    <MapContainer 
      center={[myLocation.lat, myLocation.lng]} 
      zoom={13} 
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CircleMarker 
        center={[myLocation.lat, myLocation.lng]} 
        radius={10} 
        fillColor="#3b82f6" 
        color="#fff"
        fillOpacity={1}
      >
        <Popup>You</Popup>
      </CircleMarker>

      {users.map(user => (
        <CircleMarker
          key={user.id}
          center={[user.lat, user.lng]}
          radius={8}
          fillColor="#10b981"
          color="#fff"
          fillOpacity={0.9}
        >
          <Popup>
            <div style={{ minWidth: '150px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt=""
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <strong style={{ fontSize: '16px' }}>@{user.username}</strong>
              </div>
              <p style={{ margin: '4px 0', color: '#666' }}>{user.display_name}</p>
              <p style={{ margin: '4px 0', fontSize: '13px', color: '#888' }}>{user.distance_miles?.toFixed(1)} miles away</p>
              {user.bio && <p style={{ margin: '8px 0', fontSize: '13px' }}>{user.bio}</p>}
              {user.interests?.length > 0 && (
                <p style={{ fontSize: '12px', color: '#3b82f6' }}>{user.interests.join(' · ')}</p>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={() => onViewProfile(user)}
                  style={{ flex: 1, padding: '6px 12px', background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  View Profile
                </button>
                <button
                  onClick={() => onSelectUser(user)}
                  style={{ flex: 1, padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Message
                </button>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};
