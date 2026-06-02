// config/database.js
// ============================================================
// MongoDB Database Connection Configuration with Auto-Reconnect
// ============================================================

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

dotenv.config()

const ATLAS_URI_PATTERN = /^mongodb\+srv:\/\//i
const LOCAL_MONGO_PATTERN = /(localhost|127\.0\.0\.1|::1|192\.168\.|10\.)/i
const RETRY_DELAY_MS = 5000

const isAtlasURI = (uri) => {
  if (!uri || typeof uri !== 'string') return false
  if (LOCAL_MONGO_PATTERN.test(uri)) return false
  return ATLAS_URI_PATTERN.test(uri)
}

const formatDatabaseState = (state) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }
  return states[state] || 'unknown'
}

/**
 * Seed default demo users automatically on startup if database is empty
 */
export const seedDemoUsersIfNeeded = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@college.com' })
    const teacherExists = await User.findOne({ email: 'ravi.patel@staff.college.com' })
    const studentExists = await User.findOne({ email: '24cp036@student.college.com' })

    if (!adminExists && !teacherExists && !studentExists) {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@college.com',
        password: 'Admin@123',
        collegeId: 'admin123',
        role: 'admin',
        firstLogin: false
      })

      const teacher = new User({
        name: 'Ravi Patel',
        email: 'ravi.patel@staff.college.com',
        password: 'Ravi@123',
        collegeId: 'ravi123',
        role: 'faculty',
        department: 'CSE',
        firstLogin: false
      })

      const student = new User({
        name: 'Student User',
        email: '24cp036@student.college.com',
        password: '24cp036',
        collegeId: '24cp036',
        role: 'student',
        department: 'CSE',
        semester: 4,
        firstLogin: false
      })

      await admin.save()
      await teacher.save()
      await student.save()

      console.log('[db] Demo users seeded successfully into database')
      return true
    }

    return false
  } catch (error) {
    console.error('[db] Error seeding demo users:', error.message)
    return false
  }
}

let isConnecting = false
let reconnectTimer = null
let isShuttingDown = false
let lastReconnectAttempt = 0
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS_BEFORE_WARN = 3

const scheduleReconnect = () => {
  if (isShuttingDown) {
    console.log('[db] Shutdown in progress. Skipping MongoDB reconnect schedule.')
    return
  }

  if (reconnectTimer) {
    return
  }

  reconnectAttempts++
  lastReconnectAttempt = Date.now()
  
  const shouldWarn = reconnectAttempts >= MAX_RECONNECT_ATTEMPTS_BEFORE_WARN
  if (shouldWarn) {
    console.warn(`[db] ⚠️  Reconnect attempt #${reconnectAttempts} - Connection still failing`)
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    console.log(`[db] 🔄 Retrying MongoDB connection (attempt #${reconnectAttempts})...`)
    connectDB()
  }, RETRY_DELAY_MS)
}

/**
 * Connect to MongoDB Atlas with retry support.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI

  // ============================================================
  // COMPREHENSIVE DEBUG LOGGING
  // ============================================================
  console.log('\n[db] ========== MongoDB Connection Attempt ==========')
  console.log('[db] MONGO_URI environment:', mongoURI ? 'SET' : 'NOT SET')
  
  if (mongoURI) {
    console.log('[db] URI Length:', mongoURI.length)
    console.log('[db] URI Starts with mongodb+srv://:', mongoURI.startsWith('mongodb+srv://'))
    console.log('[db] Contains <cluster>:', mongoURI.includes('<cluster>') ? 'YES - INVALID!' : 'NO')
    console.log('[db] Contains <username>:', mongoURI.includes('<username>') ? 'YES - PLACEHOLDER!' : 'NO')
    console.log('[db] Contains <password>:', mongoURI.includes('<password>') ? 'YES - PLACEHOLDER!' : 'NO')
    
    // Mask password in logs for security
    const maskedURI = mongoURI.replace(/(:)([^@]+)(@)/, ':****@')
    console.log('[db] URI (masked):', maskedURI)
  }
  console.log('[db] ===================================================\n')

  // Validation
  if (!mongoURI) {
    console.error('[db] ❌ MONGO_URI is not set in environment variables')
    console.error('[db] Make sure .env file contains: MONGO_URI=mongodb+srv://...')
    scheduleReconnect()
    return
  }

  if (mongoURI.includes('<cluster>') || mongoURI.includes('<username>') || mongoURI.includes('<password>')) {
    console.error('[db] ❌ MONGO_URI contains placeholder values - these must be replaced!')
    console.error('[db] Replace: <username>, <password>, and <cluster> with actual values')
    scheduleReconnect()
    return
  }

  if (false) {
    console.error('[db] ❌ Invalid MongoDB URI format')
    console.error('[db] Expected format: mongodb+srv://username:password@clustername.mongodb.net/dbname?retryWrites=true&w=majority')
    console.error('[db] Received:', mongoURI)
    scheduleReconnect()
    return
  }

  if (mongoose.connection.readyState === 1) {
    console.log('[db] ✓ MongoDB already connected. Skipping connection attempt.')
    return mongoose.connection
  }

  if (isConnecting) {
    console.log('[db] MongoDB connection already in progress...')
    return
  }

  isConnecting = true
  console.log('[db] 🔄 Connecting to MongoDB Atlas...')

  mongoose.set('strictQuery', false)

  try {
    console.log('[db] Sending connection request with options:', {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      family: 4
    })

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      minPoolSize: 2,
      family: 4,
      autoIndex: false,
      autoCreate: false,
      retryWrites: true,
      retryReads: true
    })

    console.log('[db] ✅ MongoDB Connected Successfully!')
    console.log(`[db] Host: ${conn.connection.host}`)
    console.log(`[db] Database: ${conn.connection.name}`)
    console.log(`[db] Connection State: ${formatDatabaseState(conn.connection.readyState)}`)

    isConnecting = false

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    await seedDemoUsersIfNeeded()
    return conn
  } catch (error) {
    console.error('\n[db] ❌ MongoDB Connection Failed!')
    console.error('[db] Error Code:', error.code)
    console.error('[db] Error Message:', error.message)
    console.error('[db] Error Name:', error.name)
    
    // Detailed error diagnostics
    if (error.code === 'ECONNREFUSED') {
      console.error('[db] Diagnosis: Connection refused - MongoDB Atlas may be unreachable')
      console.error('[db] Check: 1) Network connectivity')
      console.error('[db]       2) MongoDB Atlas IP Whitelist (add your current IP)')
      console.error('[db]       3) Cluster status in MongoDB Atlas console')
      console.error('[db]       4) Connection string accuracy')
    } else if (error.code === 'ENOTFOUND' || error.code === 'ESERVFAIL') {
      console.error('[db] Diagnosis: DNS lookup failed for', error.hostname || 'cluster')
      console.error('[db] Check: 1) Internet connectivity')
      console.error('[db]       2) DNS resolution working')
      console.error('[db]       3) Cluster hostname is correct')
    } else if (error.message.includes('authentication failed')) {
      console.error('[db] Diagnosis: Authentication failed with provided credentials')
      console.error('[db] Check: 1) Username and password are correct')
      console.error('[db]       2) Special characters are URL-encoded (@ becomes %40)')
      console.error('[db]       3) User has access to the database')
    } else if (error.message.includes('EBADNAME')) {
      console.error('[db] Diagnosis: Invalid domain name in connection string')
      console.error('[db] Check: 1) Cluster name is spelled correctly')
      console.error('[db]       2) No placeholder values like <cluster> remain')
    }
    
    console.log('[db] Reconnecting to MongoDB in 5 seconds...')
    isConnecting = false
    scheduleReconnect()
  }
}

/**
 * Disconnect from MongoDB gracefully.
 */
const disconnectDB = async () => {
  isShuttingDown = true

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  try {
    await mongoose.disconnect()
    console.log('[db] MongoDB Disconnected')
  } catch (error) {
    console.error('[db] Error disconnecting from MongoDB:', error.message)
  }
}

mongoose.connection.on('connecting', () => {
  console.log('[db] MongoDB connecting...')
})

mongoose.connection.on('connected', () => {
  console.log('[db] MongoDB connection established')
})

mongoose.connection.on('reconnecting', () => {
  console.log('[db] MongoDB reconnecting...')
})

mongoose.connection.on('reconnected', () => {
  console.log('[db] MongoDB reconnected')
})

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB lost connection. Attempting auto-reconnect...')
  if (!isShuttingDown) {
    scheduleReconnect()
  }
})

mongoose.connection.on('timeout', () => {
  console.warn('[db] MongoDB connection timeout')
})

mongoose.connection.on('error', (err) => {
  console.error(`[db] MongoDB Connection Error: ${err.message}`)
})

mongoose.connection.on('close', () => {
  console.warn('[db] MongoDB connection closed')
})

export default connectDB
export { disconnectDB, isAtlasURI }
