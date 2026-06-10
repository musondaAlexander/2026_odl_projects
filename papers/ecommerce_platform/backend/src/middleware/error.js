export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
export function notFound(req, res) { res.status(404).json({ error: 'Route not found.' }) }
export function httpError(status, message) { const e = new Error(message); e.status = status; return e }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  const payload = { error: err.message || 'Internal server error.' }
  if (err.issues) payload.details = err.issues
  res.status(status).json(payload)
}
