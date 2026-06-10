import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { User } from '../models/index.js'

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try {
    const payload = jwt.verify(token, config.jwt.secret)
    const user = await User.findByPk(payload.sub)
    if (!user) throw new Error()
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

// Optional auth: attaches req.user if a valid token is present, else continues
// (lets guests browse + get non-personalised recommendations).
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret)
      req.user = await User.findByPk(payload.sub)
    } catch { /* ignore */ }
  }
  next()
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden.' })
    next()
  }
}

export function sign(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
}
