import { useState, useEffect, useRef } from 'react';
import api from '../api.js';

const inputStyle = {
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #2a2a4e',
  background: '#0f0f23',
  color: '#fff',
  outline: 'none',
  fontSize: '14px'
};

export const ProfileEditor = ({ onClose, onUpdated }) => {
  const [form, setForm] = useState({ displayName: '', city: '', bio: '', interests: '' });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/users/me');
        const me = res.data;
        setForm({
          displayName: me.display_name || '',
          city: me.city || '',
          bio: me.bio || '',
          interests: (me.interests || []).join(', ')
        });
        setAvatarUrl(me.avatar_url || null);
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    setError(null);
    setAvatarFile(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      let newAvatarUrl = avatarUrl;

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const res = await api.post('/users/me/avatar', formData);
        newAvatarUrl = res.data.avatarUrl;
      }

      const interests = form.interests
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await api.patch('/users/me', {
        displayName: form.displayName,
        city: form.city,
        bio: form.bio,
        interests
      });

      onUpdated?.({ ...res.data, avatar_url: newAvatarUrl });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const displayedAvatar = avatarPreview || avatarUrl;

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
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        background: '#1a1a2e',
        borderRadius: '16px',
        color: '#fff',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid #2a2a4e'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700' }}>Edit Profile</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '30px 0' }}>Loading…</div>
        ) : (
          <>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: displayedAvatar ? `url(${displayedAvatar}) center/cover` : '#2a2a4e',
                  border: '2px solid #3b82f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}
              >
                {!displayedAvatar && (form.displayName?.[0]?.toUpperCase() || '?')}
              </div>
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '8px 14px', borderRadius: '8px', background: '#2a2a4e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                >
                  Change photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarPick}
                  style={{ display: 'none' }}
                />
                <div style={{ color: '#666', fontSize: '11px', marginTop: '6px' }}>JPG or PNG, up to 5MB</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                placeholder="Display Name"
                value={form.displayName}
                onChange={e => setForm({ ...form, displayName: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="City"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                style={inputStyle}
              />
              <textarea
                placeholder="Short bio"
                rows={3}
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                style={{ ...inputStyle, resize: 'none' }}
              />
              <input
                placeholder="Interests, comma separated (e.g. music, hiking, coding)"
                value={form.interests}
                onChange={e => setForm({ ...form, interests: e.target.value })}
                style={inputStyle}
              />
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '14px',
                  background: saving ? '#1e3a5f' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  marginTop: '6px'
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
