import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api.js';

export const NearbyMap = ({ myLocation, onSelectUser }) => {
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

  if (!myLocation) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff' }}>Getting your location...</div>;

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
          eventHandlers={{
            click: () => onSelectUser(user)
          }}
        >
          <Popup>
            <div style={{ minWidth: '150px' }}>
              <strong style={{ fontSize: '16px' }}>@{user.username}</strong>
              <p style={{ margin: '4px 0', color: '#666' }}>{user.display_name}</p>
              <p style={{ margin: '4px 0', fontSize: '13px', color: '#888' }}>{user.distance_miles?.toFixed(1)} miles away</p>
              {user.bio && <p style={{ margin: '8px 0', fontSize: '13px' }}>{user.bio}</p>}
              {user.interests?.length > 0 && (
                <p style={{ fontSize: '12px', color: '#3b82f6' }}>{user.interests.join(' · ')}</p>
              )}
              <button 
                onClick={() => onSelectUser(user)}
                style={{ marginTop: '10px', padding: '6px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}
              >
                Message
              </button>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};
