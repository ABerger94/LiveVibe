import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { redis } from './redis.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import { setupSocketHandlers } from './socket/handlers.js';

dotenv.config();

// Last-resort safety net. Every async Express handler is wrapped in
// asyncHandler and every async socket listener has its own try/catch, so
// this shouldn't normally fire — but on modern Node, an unhandled
// rejection anywhere crashes the whole process by default, and that's a
// much worse failure mode (every route 502s until Render restarts the
// container) than logging one bad request and carrying on.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

const app = express();
const httpServer = createServer(app);

// CLIENT_URL may be a single origin or a comma-separated list — useful for
// Vercel, which serves each project from several live domains at once
// (a stable production domain, a git-branch domain, and a per-deployment
// domain). Any exact match in the list is allowed; also allow *.vercel.app
// previews of this project so redeploys don't require touching this env var.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // non-browser requests (curl, health checks)
  if (allowedOrigins.includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'https:' && hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

const corsOriginCheck = (origin, callback) => {
  callback(null, isAllowedOrigin(origin));
};

const io = new Server(httpServer, {
  cors: { origin: corsOriginCheck }
});

app.use(cors({ origin: corsOriginCheck }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Socket.io
setupSocketHandlers(io);

// Centralized error handler — keeps errors (e.g. multer file-size/type
// rejections) as JSON instead of Express's default HTML error page.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 400).json({ error: err.message || 'Something went wrong' });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
