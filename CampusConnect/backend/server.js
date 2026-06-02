// server.js
// ============================================================
// CampusConnect Backend Server - Stable & Production-Ready
// ============================================================

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import morgan from 'morgan'
import mongoose from 'mongoose'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import connectDB, { isAtlasURI } from './config/database.js'
import authRoutes from './routes/auth.js'
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js'
import initSocket from './utils/socket.js'
import { setIO } from './utils/socketServer.js'
import attendanceRoutes from './routes/attendance.js'
import {runMongoDBDiagnostics} from './utils/mongodbDiagnostics.js'

// Load environment variables - MUST be at top
dotenv.config()

console.log('\n[env] ========== Environment Variables Loaded ==========')
console.log('[env] MONGO_URI:', process.env.MONGO_URI ? '✓ SET' : '✗ NOT SET')
console.log('[env] JWT_SECRET:', process.env.JWT_SECRET ? '✓ SET' : '✗ NOT SET')
console.log('[env] CLIENT_URL:', process.env.CLIENT_URL ? '✓ SET' : '✗ NOT SET')
console.log('[env] FRONTEND_URL:', process.env.FRONTEND_URL ? '✓ SET' : '✗ NOT SET')
console.log('[env] NODE_ENV:', process.env.NODE_ENV || 'development')
console.log('[env] PORT:', process.env.PORT || 5000)
console.log('[env] =====================================================\n')

// DEBUG: Log environment variables
if (process.env.MONGO_URI) {
  const maskedURI = process.env.MONGO_URI.replace(/(:)([^@]+)(@)/, ':****@')
  console.log('[env] MONGO_URI (masked):', maskedURI)
}

// ------------------------------------------------------------
// Environment Validation
// ------------------------------------------------------------
let mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI
const portValue = process.env.PORT
const PORT = Number(portValue) || 5000

if (!mongoURI) {
  const localFallback = 'mongodb://127.0.0.1:27017/campusconnect'
  console.warn('[env] MONGO_URI not set. Falling back to local MongoDB:', localFallback)
  mongoURI = localFallback
}

if (!process.env.CLIENT_URL) {
  const defaultClientUrl = 'http://localhost:5173'
  console.warn('[env] CLIENT_URL not set. Defaulting to', defaultClientUrl)
  process.env.CLIENT_URL = defaultClientUrl
}

if (!process.env.JWT_SECRET) {
  const defaultJwtSecret = 'development-secret'
  console.warn('[env] JWT_SECRET not set. Falling back to insecure development secret.')
  process.env.JWT_SECRET = defaultJwtSecret
}

if (portValue && Number.isNaN(PORT)) {
  console.error('[env] Invalid PORT value:', portValue)
}

const isLocalMongo = mongoURI && /^mongodb:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(mongoURI)
if (mongoURI && !isAtlasURI(mongoURI) && !isLocalMongo) {
  console.error('[env] Invalid MongoDB Atlas URI. Only mongodb+srv:// URIs are supported for Atlas deployments.')
  console.error('[env] Received:', mongoURI)
}

// ------------------------------------------------------------
// Process Level Crash Handlers
// ------------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception caught!', err.message)
  console.error(err.stack)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Promise Rejection at:', promise, 'reason:', reason)
})

const app = express()

app.locals.socketIOActive = false

// ------------------------------------------------------------
// Stable Middleware Configuration
// ------------------------------------------------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' }
}));
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const clientUrls = [
  ...(process.env.FRONTEND_URL || '').split(',').map(url => url.trim()),
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://[::1]:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://[::1]:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://[::1]:5173'
].filter(Boolean)

const allowedOrigins = [...new Set(clientUrls)]

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true)
      return
    }

    console.warn('[cors] Origin blocked:', origin)
    callback(new Error('Blocked by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// ------------------------------------------------------------
// API Routing
// ------------------------------------------------------------
app.get('/api/test', (req, res) => {
  console.log('[api] Test endpoint accessed')
  res.send('Backend Working')
})

app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }

  res.json({
    success: true,
    server: 'running',
    database: {
      connected: state === 1,
      state: stateMap[state] || 'unknown',
      atlas: Boolean(mongoURI && isAtlasURI(mongoURI))
    },
    socketio: app.locals.socketIOActive ? 'active' : 'inactive'
  })
})

app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter)

// Provide a simple non-namespaced health endpoint useful for external checks
app.get('/health', (req, res) => {
  const state = mongoose.connection.readyState
  res.status(200).json({
    success: true,
    server: 'online',
    database: { connected: state === 1 },
    timestamp: new Date().toISOString()
  })
})

app.use('/api/auth', authRoutes)
// Attendance APIs (QR attendance)
app.use('/api/attendance', attendanceRoutes)

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
    path: req.path
  })
})

app.use((err, req, res, next) => {
  console.error('[server] Error caught in middleware:', err.message)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  })
})

// ------------------------------------------------------------
// Boot Server & Establish DB Connection
// ------------------------------------------------------------
const httpServer = http.createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
})

initSocket(io)
// expose io to controllers
setIO(io)
app.locals.socketIOActive = true

httpServer.listen(PORT, () => {
  console.log('[server] ✅ Server running on port', PORT)
  console.log('[server] ✅ Socket.IO active')
  
  // Run diagnostics if MONGO_URI is set
  if (mongoURI) {
    console.log('[server] Running MongoDB connection diagnostics...')
    // Delay diagnostics to let connection attempt start first
    setTimeout(() => {
      runMongoDBDiagnostics(mongoURI)
    }, 2000)
  }
})

connectDB()

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`)
  app.locals.socketIOActive = false

  try {
    await mongoose.disconnect()
    console.log('[server] MongoDB disconnected cleanly')
  } catch (error) {
    console.error('[server] Error during MongoDB disconnect:', error.message)
  }

  httpServer.close(() => {
    console.log('[server] HTTP server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export default app
