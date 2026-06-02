// controllers/authController.js
// ============================================================
// Authentication Controller - Handles user auth operations
// ============================================================

import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normalizeCollegeId = (collegeId = '') => collegeId.trim().toLowerCase()

const isDatabaseConnected = () => mongoose.connection.readyState === 1

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRE })
}

/**
 * LOGIN - Authenticate user with email and password
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { identifier, email, password, rememberMe, role } = req.body
    const loginIdentifier = (identifier || email || '').trim().toLowerCase()

    // Validate input
    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or college ID and password'
      })
    }

    // Find user by email or college ID (need to select password field)
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier },
        { collegeId: loginIdentifier }
      ]
    }).select('+password')

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found. Please register first.' })
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `This account is not registered for the selected role`
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact admin.' })
    }

    // Compare passwords
    const isPasswordCorrect = await user.comparePassword(password)
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role)

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    const publicUser = user.getPublicData()

    return res.status(200).json({ success: true, token, user: publicUser })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: 'Server error during login' })
  }
}

/**
 * SIGNUP - Create new user (Admin or system use)
 * POST /api/auth/signup
 */
export const register = async (req, res) => {
  console.log('Register API called')
  console.log('[register] Incoming registration request:', {
    role: req.body?.role,
    email: req.body?.email,
    collegeId: req.body?.collegeId
  })

  try {
    const { name, email, password, collegeId, role, department, semester } = req.body
    const normalizedName = (name || '').trim()
    const normalizedCollegeId = normalizeCollegeId(collegeId)
    const normalizedEmail = (email || '').trim().toLowerCase()

    // Validate input
    if (!normalizedName || !normalizedEmail || !password || !role) {
      console.warn('[signup] Missing required fields')
      return res.status(400).json({ success: false, message: 'Please provide name, email, password, and role' })
    }

    if (!['student', 'faculty', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role selected' })
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' })
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
    }

    const initialPassword = password

    if (!isDatabaseConnected()) {
      console.error('[signup] MongoDB is not connected. readyState:', mongoose.connection.readyState)
      return res.status(503).json({ success: false, message: 'Database connection unavailable. Please check MongoDB connection.' })
    }

    if (role === 'admin' && !req.user) {
      const existingAdmin = await User.findOne({ role: 'admin' })
      if (existingAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Administrator already exists. Please ask the current admin to create accounts.'
        })
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        ...(normalizedCollegeId ? [{ collegeId: normalizedCollegeId }] : [])
      ]
    })
    if (existingUser) {
      console.warn('[signup] Duplicate user found:', { existingId: existingUser._id, email: normalizedEmail, collegeId: normalizedCollegeId })
      return res.status(409).json({ success: false, message: 'User already registered' })
    }

    // Create new user
    const newUser = new User({
      name: normalizedName,
      email: normalizedEmail,
      password: initialPassword,
      collegeId: normalizedCollegeId || undefined,
      role,
      department,
      semester,
      firstLogin: true // Force password change on first login
    })

    await newUser.save()
    console.log('[signup] User created:', { id: newUser._id, email: normalizedEmail, collegeId: normalizedCollegeId, role })

    // Generate JWT token so the client can log in immediately after signup
    const token = generateToken(newUser._id, newUser.role)
    const publicUser = newUser.getPublicData()

    return res.status(201).json({ success: true, token, user: publicUser })
  } catch (error) {
    console.error('[signup] Registration error:', {
      name: error.name,
      code: error.code,
      message: error.message,
      errors: error.errors
    })
    const duplicateKey = error.code === 11000
    const validationError = error.name === 'ValidationError'

    if (duplicateKey) {
      return res.status(409).json({ success: false, message: 'User already registered' })
    }

    if (validationError) {
      return res.status(400).json({ success: false, message: Object.values(error.errors)[0]?.message || 'Invalid registration details' })
    }

    return res.status(500).json({ success: false, message: 'Error creating user' })
  }
}

export const createUser = register

/**
 * CHANGE PASSWORD - Update password after first login
 * PUT /api/auth/change-password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body
    const userId = req.user?.userId

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      })
    }

    // Find user
    const user = await User.findById(userId).select('+password')
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Verify current password
    const isCurrentPasswordCorrect = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // Update password
    user.password = newPassword
    user.firstLogin = false // Mark first login as complete
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      user: user.getPublicData()
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    })
  }
}

/**
 * GET USER PROFILE
 * GET /api/auth/profile
 */
export const getCurrentUser = async (req, res) => {
  try {
    // Prefer the user data attached by middleware
    if (req.currentUser) {
      return res.status(200).json({ success: true, user: req.currentUser })
    }

    const user = await User.findById(req.user.userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    return res.status(200).json({ success: true, user: user.getPublicData() })
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({ success: false, message: 'Error fetching current user' })
  }
}

/**
 * LOGOUT
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: error.message
    })
  }
}

/**
 * ADMIN - GET ALL USERS
 * GET /api/auth/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
    
    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(u => u.getPublicData())
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    })
  }
}

/**
 * ADMIN - UPDATE USER
 * PUT /api/auth/users/:userId
 */
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params
    const { name, email, department, semester, isActive } = req.body

    const user = await User.findByIdAndUpdate(
      userId,
      { name, email, department, semester, isActive },
      { new: true, runValidators: true }
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: user.getPublicData()
    })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    })
  }
}

/**
 * ADMIN - RESET PASSWORD
 * POST /api/auth/users/:userId/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { userId } = req.params
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    user.password = newPassword
    user.firstLogin = true // Force user to change password on next login
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    })
  }
}

/**
 * ADMIN - DELETE USER
 * DELETE /api/auth/users/:userId
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params

    const user = await User.findByIdAndDelete(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    })
  }
}
