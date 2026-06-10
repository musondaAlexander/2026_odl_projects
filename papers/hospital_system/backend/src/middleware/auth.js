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
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid session.' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

// Role-based access control.
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' })
    }
    next()
  }
}

export function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpires,
  })
}
export function signRefresh(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpires,
  })
}
