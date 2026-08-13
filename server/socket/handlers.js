import { pool } from '../db.js';
import { redis } from '../redis.js';

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    let userId = null;

    // Authenticate socket
    socket.on('authenticate', async (token) => {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        userId = decoded.userId;
        socket.userId = userId;

        // Join personal room for direct messages
        socket.join(`user:${userId}`);

        // Mark online
        await pool.query(
          `UPDATE users SET is_online = true, last_active_at = NOW() WHERE id = $1`,
          [userId]
        );
        await redis.set(`user:${userId}:online`, '1', { EX: 300 }); // 5 min TTL

        // Notify nearby users
        socket.broadcast.emit('user_online', { userId });

      } catch (err) {
        socket.emit('error', 'Authentication failed');
      }
    });

    // Handle direct messages in real-time
    socket.on('send_message', (data) => {
      if (!socket.userId) return;

      const { recipientId, content } = data;

      // Broadcast to recipient if online
      io.to(`user:${recipientId}`).emit('new_message', {
        senderId: socket.userId,
        content,
        createdAt: new Date().toISOString()
      });

      // Also broadcast to sender for confirmation
      socket.emit('message_sent', { recipientId, content });
    });

    // Typing indicators
    socket.on('typing', (data) => {
      if (!socket.userId) return;
      io.to(`user:${data.recipientId}`).emit('typing', { userId: socket.userId });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      if (!userId) return;

      // Don't immediately mark offline — they might reconnect. Same reason
      // as the 'authenticate' handler above: a rejected promise in here
      // (e.g. a DB hiccup) is not attached to any request/response, so
      // Express's error handling never sees it — left unguarded it becomes
      // an unhandled rejection, which crashes the whole Node process on
      // modern Node, taking down every route until Render restarts it.
      setTimeout(async () => {
        try {
          const stillOnline = await redis.get(`user:${userId}:online`);
          if (!stillOnline) {
            await pool.query(
              `UPDATE users SET is_online = false WHERE id = $1`,
              [userId]
            );
            io.emit('user_offline', { userId });
          }
        } catch (err) {
          console.error('Failed to process disconnect for', userId, err);
        }
      }, 10000); // 10 second grace period
    });
  });
};
