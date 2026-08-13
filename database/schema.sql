-- Nearby Social - Database Schema
-- Run this in your PostgreSQL database after enabling PostGIS

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE users (
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
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations (for quick lookup)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- Indexes for performance
CREATE INDEX idx_users_location ON users USING GIST (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
);
CREATE INDEX idx_users_online ON users(is_online, last_active_at);
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id, created_at);
CREATE INDEX idx_conversations_users ON conversations(user1_id, user2_id);

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
