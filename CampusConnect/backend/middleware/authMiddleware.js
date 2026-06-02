// middleware/authMiddleware.js
// ============================================================
// Authentication Middleware - JWT verification
// ============================================================

import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d'

/**
 * Protect Routes - Verify Bearer JWT Token and attach current user
 */
export const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized: token missing' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    // Attach minimal token info
    req.user = { userId: decoded.userId, role: decoded.role }

    // Fetch fresh user data from DB (exclude password)
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized: user not found' })
    }

    req.currentUser = user.getPublicData()
    next()
  } catch (error) {
    console.error('[auth] JWT verification failed:', error.message)
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

/**
 * Grant Access to Specific Roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    const role = req.user?.role
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ success: false, message: `User role '${role}' is not authorized to access this route` })
    }
    next()
  }
}

/**
 * Generate JWT Token
 */
export const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRE })
}
