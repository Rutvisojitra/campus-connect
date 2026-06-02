// models/User.js
// ============================================================
// User Model - Student/Admin Schema
// ============================================================

import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'

const userSchema = new mongoose.Schema({
  // Personal Information
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false // Don't return password by default
  },
  collegeId: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  rollNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  department: {
    type: String,
    enum: ['CSE', 'ECE', 'ME', 'CIVIL', 'EEE', 'BT', 'Other'],
    default: 'CSE'
  },
  semester: {
    type: Number,
    min: 1,
    max: 8
  },
  phone: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  address: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    default: null
  },

  // Account Settings
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  firstLogin: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,

  // Preferences
  darkMode: {
    type: Boolean,
    default: false
  },
  notifications: {
    type: Boolean,
    default: true
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date
}, {
  timestamps: true
})

// ============================================================
// MIDDLEWARE: Hash Password Before Saving
// ============================================================

userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified
  if (!this.isModified('password')) {
    next()
    return
  }

  try {
    const salt = await bcryptjs.genSalt(10)
    this.password = await bcryptjs.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// ============================================================
// METHODS
// ============================================================

/**
 * Compare password for authentication
 */
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password)
}

/**
 * Get public user data
 */
userSchema.methods.getPublicData = function() {
  const user = this.toObject({ getters: true })
  // Remove sensitive fields
  delete user.password
  delete user.verificationToken
  delete user.__v

  // Provide compatibility field expected by frontend
  user.avatar = user.profileImage || null

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    collegeId: user.collegeId || null,
    avatar: user.avatar,
    firstLogin: Boolean(user.firstLogin),
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin
  }
}

export default mongoose.model('User', userSchema)
