// routes/attendance.js
import express from 'express'
import { protect, authorize } from '../middleware/authMiddleware.js'
import { startAttendance, endAttendance, rotateQr, getSession } from '../controllers/qrController.js'
import { scanAttendance, getSessionAttendance, getStats } from '../controllers/attendanceController.js'

const router = express.Router()

// Teacher starts attendance (teacher only)
router.post('/start', protect, authorize('faculty','admin'), startAttendance)

// Rotate QR (optional manual rotate)
router.post('/rotate/:sessionId', protect, authorize('faculty','admin'), rotateQr)

// End attendance
router.post('/end', protect, authorize('faculty','admin'), endAttendance)

// Student scans QR
router.post('/scan', protect, authorize('student','faculty','admin'), scanAttendance)

// Get session attendance
router.get('/session/:id', protect, authorize('faculty','admin'), getSessionAttendance)

// Get session meta
router.get('/session-meta/:id', protect, getSession)

// Stats
router.get('/stats', protect, authorize('faculty','admin'), getStats)

export default router
