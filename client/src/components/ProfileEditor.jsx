import { useState, useEffect, useRef } from 'react';
import api from '../api.js';

const MAX_PHOTOS = 6;

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
  const [form, setForm] = useState({ displayName: '', city: '', bio: '' });
  const [interests, setInterests] = useState([]);
  const [interestInput, setInterestInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const avatarInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/users/me');
        const me = res.data;
        setForm({
          displayName: me.display_name || '',
          city: me.city || '',
          bio: me.bio || ''
        });
        setInterests(me.interests || []);
        setAvatarUrl(me.avatar_url || null);

        const photosRes = await api.get(`/users/${me.id}/photos`);
        setPhotos(photosRes.data);
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

  const addInterest = () => {
    const tag = interestInput.trim();
    if (!tag) return;
    if (interests.some(i => i.toLowerCase() === tag.toLowerCase())) {
      setInterestInput('');
      return;
    }
    if (interests.length >= 15) {
      setError('Up to 15 interests');
      return;
    }
    setInterests([...interests, tag]);
    setInterestInput('');
  };

  const removeInterest = (tag) => {
    setInterests(interests.filter(i => i !== tag));
  };

  const handleInterestKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addInterest();
    } else if (e.key === 'Backspace' && !interestInput && interests.length > 0) {
      removeInterest(interests[interests.length - 1]);
    }
  };

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      setError(`You can upload up to ${MAX_PHOTOS} photos`);
      return;
    }

    setError(null);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.post('/users/me/photos', formData);
      setPhotos(prev => [...prev, res.data]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async (photoId) => {
    const prevPhotos = photos;
    setPhotos(photos.filter(p => p.id !== photoId));
    try {
      await api.delete(`/users/me/photos/${photoId}`);
    } catch (err) {
      setPhotos(prevPhotos);
      setError('Failed to delete photo');
    }
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
        maxWidth: '440px',
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
                onClick={() => avatarInputRef.current?.click()}
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
                  onClick={() => avatarInputRef.current?.click()}
                  style={{ padding: '8px 14px', borderRadius: '8px', background: '#2a2a4e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                >
                  Change profile photo
                </button>
                <input
                  ref={avatarInputRef}
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

              <div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  padding: interests.length ? '10px 10px 4px' : '0',
                }}>
                  {interests.map(tag => (
                    <span key={tag} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(59,130,246,0.15)',
                      color: '#3b82f6',
                      padding: '4px 6px 4px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      marginBottom: '6px'
                    }}>
                      {tag}
                      <button
                        onClick={() => removeInterest(tag)}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', padding: 0, lineHeight: 1 }}
                        aria-label={`Remove ${tag}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  placeholder="Add an interest and press Enter (e.g. music, hiking)"
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  onKeyDown={handleInterestKeyDown}
                  onBlur={addInterest}
                  style={inputStyle}
                />
              </div>

              <div>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Photos ({photos.length}/{MAX_PHOTOS})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {photos.map(photo => (
                    <div key={photo.id} style={{ position: 'relative', paddingTop: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                      <img
                        src={photo.url}
                        alt=""
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        onClick={() => handlePhotoDelete(photo.id)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                        aria-label="Delete photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {photos.length < MAX_PHOTOS && (
                    <div
                      onClick={() => !uploadingPhoto && photoInputRef.current?.click()}
                      style={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: '8px',
                        border: '1px dashed #3b82f6',
                        cursor: uploadingPhoto ? 'default' : 'pointer'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6',
                        fontSize: '13px'
                      }}>
                        {uploadingPhoto ? '…' : '+ Add'}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoPick}
                  style={{ display: 'none' }}
                />
              </div>

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
