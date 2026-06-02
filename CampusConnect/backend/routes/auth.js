// routes/auth.js
// ============================================================
// Authentication Routes
// ============================================================

import express from 'express'
import {
  register,
  login,
  logout,
  getCurrentUser,
  changePassword,
  createUser,
  getAllUsers,
  updateUser,
  resetPassword,
  deleteUser
} from '../controllers/authController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

// ============================================================
// PUBLIC ROUTES
// ============================================================
router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)

// ============================================================
// AUTHENTICATED ROUTES
// ============================================================
router.get('/me', protect, getCurrentUser)
router.get('/profile', protect, getCurrentUser)
router.put('/change-password', protect, changePassword)

// ============================================================
// ADMIN ROUTES (Admin Only)
// ============================================================
router.get('/users', protect, authorize('admin'), getAllUsers)
router.post('/users', protect, authorize('admin'), createUser)
router.put('/users/:userId', protect, authorize('admin'), updateUser)
router.post('/users/:userId/reset-password', protect, authorize('admin'), resetPassword)
router.delete('/users/:userId', protect, authorize('admin'), deleteUser)

export default router
