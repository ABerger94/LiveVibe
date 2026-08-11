# Nearby Social — MVP

A real-time, location-based social app. See who's online within 30 miles, send 5 free messages to initiate conversations.

## Features

- **Real-time map** showing online users nearby
- **Live chat** with Socket.io
- **5-message daily limit** for starting new conversations
- **Geospatial queries** via PostGIS
- **Online/offline presence** with Redis
- **JWT authentication**

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with PostGIS
- Redis 7+

### 1. Database Setup

```bash
# Create database
createdb nearby_social

# Enable PostGIS and run schema
psql nearby_social < database/schema.sql
```

### 2. Server

```bash
cd server
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run dev
```

Server runs on `http://localhost:3001`

### 3. Client

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Client runs on `http://localhost:5173`

## Project Structure

```
nearby-social/
├── server/           # Node.js + Express + Socket.io
│   ├── routes/       # API routes (auth, users, messages)
│   ├── socket/       # Real-time handlers
│   ├── middleware/   # JWT auth
│   └── db.js         # PostgreSQL pool
├── client/           # React + Vite + Leaflet
│   ├── src/
│   │   ├── components/   # Map, Chat, UI
│   │   └── hooks/        # useLocation, useSocket
│   └── index.html
└── database/
    └── schema.sql    # PostgreSQL + PostGIS setup
```

## How the 5-Message Limit Works

1. User A sends a message to User B for the first time
2. Server checks if a conversation exists between them
3. If not, it checks `messages_remaining` (default: 5)
4. If > 0, message sends and counter decrements by 1
5. If User B replies, a conversation record is created
6. Future messages in that thread are unlimited
7. Counter resets to 5 every 24 hours

## Deployment (Railway)

1. Push this repo to GitHub
2. Create a new Railway project, connect the repo
3. Add PostgreSQL and Redis services
4. Set environment variables in Railway dashboard
5. Deploy — Railway handles the rest

## Next Steps

- [ ] Push notifications (OneSignal or Firebase)
- [ ] Photo uploads (Cloudinary or S3)
- [ ] In-app purchases (Stripe)
- [ ] Report/block users
- [ ] React Native app
- [ ] City-by-city launch strategy

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js, Express, Socket.io |
| Database | PostgreSQL + PostGIS |
| Cache | Redis |
| Frontend | React, Vite, Leaflet |
| Auth | JWT + bcrypt |
