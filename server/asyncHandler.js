// Wraps an async Express route handler so a rejected promise is forwarded
// to next(err) instead of being left unhandled. Express 4 does not do this
// automatically for async handlers — and an unhandled rejection crashes the
// whole Node process by default on modern Node (15+), taking down every
// route until the process restarts, not just the one request that failed.
// That's what turns "one query hiccupped" into "the whole server 502s for
// a while", which is exactly what an un-wrapped handler risks on every
// single await in it.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
