import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useLocation } from './hooks/useLocation.js';
import { useSocket } from './hooks/useSocket.js';
import { NearbyMap } from './components/NearbyMap.jsx';
import { ChatWindow } from './components/ChatWindow.jsx';
import { ProfileEditor } from './components/ProfileEditor.jsx';
import { ProfileViewer } from './components/ProfileViewer.jsx';
import api from './api.js';

const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '', city: '', bio: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)',
      padding: '20px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: '36px', 
        background: '#1a1a2e', 
        borderRadius: '16px', 
        color: '#fff',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        border: '1px solid #2a2a4e'
      }}>
        <h2 style={{ fontSize: '28px', marginBottom: '8px', fontWeight: '700' }}>
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p style={{ color: '#888', marginBottom: '28px', fontSize: '14px' }}>
          {isRegister ? 'Join the local conversation.' : "See who's nearby right now."}
        </p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRegister && (
            <>
              <input 
                placeholder="Username" 
                required
                onChange={e => setForm({...form, username: e.target.value})} 
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #2a2a4e', background: '#0f0f23', color: '#fff', outline: 'none', fontSize: '14px' }} 
              />
              <input 
                placeholder="Display Name" 
                required
                onChange={e => setForm({...form, displayName: e.target.value})} 
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #2a2a4e', background: '#0f0f23', color: '#fff', outline: 'none', fontSize: '14px' }} 
              />
              <input 
                placeholder="City (e.g. Austin)" 
                required
                onChange={e => setForm({...form, city: e.target.value})} 
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #2a2a4e', background: '#0f0f23', color: '#fff', outline: 'none', fontSize: '14px' }} 
              />
              <textarea 
                placeholder="Short bio (optional)" 
                rows={2}
                onChange={e => setForm({...form, bio: e.target.value})} 
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #2a2a4e', background: '#0f0f23', color: '#fff', outline: 'none', fontSize: '14px', resize: 'none' }} 
              />
            </>
          )}
          <input 
            placeholder="Email" 
            type="email" 
            required
            onChange={e => setForm({...form, email: e.target.value})} 
            style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #2a2a4e', background: '#0f0f23', color: '#fff', outline: 'none', fontSize: '14px' }} 
          />
          <input 
            placeholder="Password" 
            type="password" 
            required
            onChange={e => setForm({...form, password: e.target.value})} 
            style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #2a2a4e', background: '#0f0f23', color: '#fff', outline: 'none', fontSize: '14px' }} 
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '14px', 
              background: loading ? '#1e3a5f' : '#3b82f6', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '6px'
            }}
          >
            {loading ? '...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', color: '#888', fontSize: '14px', cursor: 'pointer' }} onClick={() => { setIsRegister(!isRegister); setError(null); }}>
          {isRegister ? 'Already have an account? ' : 'Need an account? '}
          <span style={{ color: '#3b82f6', fontWeight: '500' }}>{isRegister ? 'Sign in' : 'Create one'}</span>
        </p>
      </div>
    </div>
  );
};

const MainApp = () => {
  const { location, error: locationError, updateLocation } = useLocation();
  const { connected, authenticate } = useSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [myProfile, setMyProfile] = useState(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get('/users/me').then(res => setMyProfile(res.data)).catch(() => {});
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
    authenticate(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    window.location.reload();
  };

  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <div style={{ position: 'relative', height: '100vh', background: '#0f0f23' }}>
      {/* Status bar */}
      <div style={{ 
        position: 'absolute', 
        top: '16px', 
        left: '16px', 
        zIndex: 1000, 
        background: 'rgba(26,26,46,0.95)', 
        padding: '10px 18px', 
        borderRadius: '10px', 
        color: '#fff',
        backdropFilter: 'blur(10px)',
        border: '1px solid #2a2a4e',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '13px'
      }}>
        <span style={{ color: connected ? '#10b981' : '#ef4444' }}>
          {connected ? '● Live' : '● Offline'}
        </span>
        <span style={{ color: '#666' }}>|</span>
        <span style={{ color: '#888' }}>
          {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Locating...'}
        </span>
        <span style={{ color: '#666' }}>|</span>
        <button
          onClick={() => setShowProfileEditor(true)}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: myProfile?.avatar_url ? `url(${myProfile.avatar_url}) center/cover` : '#2a2a4e',
            border: '1px solid #3b82f6',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            color: '#fff'
          }}
          title="Edit profile"
        >
          {!myProfile?.avatar_url && (myProfile?.display_name?.[0]?.toUpperCase() || '')}
        </button>
        <button
          onClick={() => setShowProfileEditor(true)}
          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px' }}
        >
          Edit Profile
        </button>
        <span style={{ color: '#666' }}>|</span>
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
        >
          Logout
        </button>
      </div>

      <NearbyMap
        myLocation={location}
        locationError={locationError}
        onRetryLocation={updateLocation}
        onSelectUser={setSelectedUser}
        onViewProfile={setViewingProfile}
      />

      {selectedUser && (
        <ChatWindow user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {viewingProfile && (
        <ProfileViewer
          user={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onMessage={(user) => {
            setViewingProfile(null);
            setSelectedUser(user);
          }}
        />
      )}

      {showProfileEditor && (
        <ProfileEditor
          onClose={() => setShowProfileEditor(false)}
          onUpdated={(updated) => setMyProfile(prev => ({ ...prev, ...updated }))}
        />
      )}
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="*" element={<MainApp />} />
    </Routes>
  </BrowserRouter>
);

export default App;
