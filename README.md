# Nearby Social — MVP

A real-time, location-based social app. See who's online within 30 miles, send 3 free messages to initiate conversations.

## Features

- **Real-time map** showing online users nearby — fuzzed positions only
  (~0.4mi random offset, never someone's exact coordinates; see
  `server/geoFuzz.js`)
- **Live chat** with Socket.io
- **Message limit** for starting new conversations (currently disabled for
  testing — `ENFORCE_MESSAGE_LIMIT` in `server/routes/messages.js`)
- **Editable profiles** — display name, city, bio, interest tags, avatar
  photo, and a swipeable multi-photo gallery (up to 6 photos)
- **View other users' profiles** — a "View Profile" action on the map,
  separate from messaging
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

## How the 3-Message Limit Works

1. User A sends a message to User B for the first time
2. Server checks if a conversation exists between them
3. If not, it checks `messages_remaining` (default: 3)
4. If > 0, message sends and counter decrements by 1
5. If User B replies, a conversation record is created
6. Future messages in that thread are unlimited
7. Counter resets to 3 every 24 hours

## Deployment

**Frontend** — deploy `client/` to Vercel (Root Directory = `client`, framework
auto-detected as Vite). Set `VITE_API_URL` to the backend's origin (no `/api`
suffix, no trailing slash).

**Backend** — `server/` is a persistent Express + Socket.io process, so it
needs a host that keeps a Node process running, not a serverless platform.
Any of these work; the repo ships a `render.yaml` blueprint for the first:

- **Render** (free tier) — New → Blueprint → point at this repo, or manually
  create a Web Service with Root Directory `server`, build `npm install`,
  start `npm start`. The free plan spins the service down after ~15 min
  idle, which drops open sockets and adds a cold-start delay on the next
  request — fine for a demo, not for "who's online" accuracy under real use.
- **Fly.io** — a couple dollars/month for an always-on machine, no
  spin-down. `fly launch` from `server/`, then `fly deploy`.
- **Railway** — original target platform, if/when available again.

**Database** — independent of whichever compute host you pick:

- **Supabase** (Postgres, free tier) — create a project, enable the PostGIS
  extension (SQL editor → `create extension if not exists postgis;`, or the
  Database → Extensions toggle), then run `database/schema.sql` against it
  (safe to re-run after schema changes — every statement is idempotent).
  Use the connection string as `DATABASE_URL`.

**Cache (optional)** — Redis is only used to smooth over brief disconnects
(a grace period before flipping a user offline); `server/redis.js` falls
back to a no-op stub if `REDIS_URL` isn't set, so it can be skipped entirely
to start. Add it later with **Upstash** (free tier, use its `rediss://` URL
as `REDIS_URL`) if reconnect flicker becomes annoying.

**Photo uploads (optional)** — the avatar and the multi-photo gallery are
both stored in Supabase Storage (`avatars` and `photos` buckets).
`database/schema.sql` creates both automatically when run against a
Supabase project, along with the `user_photos` table the gallery uses. Get
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Supabase → Project
Settings → API and set both on the backend host; `server/supabase.js`
disables uploads gracefully if they're missing, everything else still
works.

Set on the backend host: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` (the
deployed Vercel URL — required for CORS and Socket.io to accept the
frontend's origin), and `NODE_ENV=production` (gates SSL for the Postgres
connection in `db.js`). `REDIS_URL` and the two `SUPABASE_*` vars are
optional, per above.

## Next Steps

- [ ] Push notifications (OneSignal or Firebase)
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
