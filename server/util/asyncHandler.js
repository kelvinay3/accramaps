// Express 4 doesn't forward rejected promises to the error handler — wrap
// async route handlers so a thrown error becomes a clean 500, not a hang.
export const ah = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
