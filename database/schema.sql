-- Nearby Social - Database Schema
-- Run this in your PostgreSQL database after enabling PostGIS

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(50),
    bio VARCHAR(160),
    avatar_url VARCHAR(500),
    interests TEXT[], -- e.g., ['music', 'hiking', 'coding']
    city VARCHAR(100),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    location_updated_at TIMESTAMP,
    is_online BOOLEAN DEFAULT false,
    last_active_at TIMESTAMP DEFAULT NOW(),
    messages_remaining INT DEFAULT 3,
    messages_reset_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations (for quick lookup)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- Profile photo gallery (separate from users.avatar_url, which is the
-- small profile picture shown in map markers/chat headers). storage_path
-- is the Supabase Storage object key, kept alongside the public url so a
-- delete doesn't need to reverse-parse it back out of the URL.
CREATE TABLE IF NOT EXISTS user_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_location ON users USING GIST (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online, last_active_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_user ON user_photos(user_id, position);

-- Storage buckets. Supabase-specific (storage.buckets only exists on
-- Supabase projects) — remove this block if running against plain
-- PostgreSQL, since photo uploads require Supabase Storage anyway. Both
-- public so images can be viewed via their public URL directly; all
-- writes go through the backend using the service-role key, which bypasses
-- RLS, so no additional storage policies are required.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Optional: Add a function to clean up old offline users
CREATE OR REPLACE FUNCTION cleanup_offline_users()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET is_online = false 
    WHERE is_online = true 
      AND last_active_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;
