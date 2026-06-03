// controllers/attendanceController.js
import Attendance from '../models/Attendance.js'
import QRSession from '../models/QRSession.js'
import { verifyQrToken } from '../utils/qrManager.js'
import { getIO } from '../utils/socketServer.js'
import User from '../models/User.js'

/**
 * Student scans QR to mark attendance
 * POST /api/attendance/scan
 * body: { qrSessionId, token }
 * Security: Validates role, token expiration, rotation count, duplicate scans, session status
 */
export const scanAttendance = async (req, res) => {
  try {
    const studentId = req.user.userId
    const userRole = req.user.role
    const { qrSessionId, token, deviceInfo, location } = req.body

    // Log attendance attempt
    console.log('[attendance] Scan attempt', {
      studentId,
      userRole,
      qrSessionId,
      ip: req.ip,
      timestamp: new Date().toISOString()
    })

    // SECURITY: Validate role - only students can scan (unless faculty/admin for verification)
    if (!['student', 'faculty', 'admin'].includes(userRole)) {
      console.warn('[attendance] Unauthorized role attempt', { userRole, studentId })
      return res.status(403).json({ success: false, message: 'Your role cannot mark attendance' })
    }

    if (!qrSessionId || !token) {
      console.warn('[attendance] Missing required params', { qrSessionId, token })
      return res.status(400).json({ success: false, message: 'qrSessionId and token required' })
    }

    // Verify QR token and check expiration
    const { valid, decoded, reason } = verifyQrToken(token)
    if (!valid) {
      console.warn('[attendance] Invalid token', { reason, studentId, qrSessionId })
      return res.status(400).json({ success: false, message: `Invalid or expired QR token: ${reason}` })
    }

    // Sanity checks - token must match session
    if (decoded.qrSessionId !== qrSessionId) {
      console.warn('[attendance] Token/session mismatch', { decodedSessionId: decoded.qrSessionId, requestedSessionId: qrSessionId })
      return res.status(400).json({ success: false, message: 'QR token does not match session' })
    }

    // Get session and validate it's still active
    const session = await QRSession.findById(qrSessionId)
    if (!session) {
      console.warn('[attendance] Session not found', { qrSessionId })
      return res.status(404).json({ success: false, message: 'QR session not found' })
    }
    
    if (!session.active) {
      console.warn('[attendance] Session inactive', { qrSessionId, active: session.active })
      return res.status(410).json({ success: false, message: 'QR session has ended' })
    }

    // SECURITY: Validate rotation count - prevent use of old/stale QR codes
    if (decoded.rotationCount !== session.rotationCount) {
      console.warn('[attendance] Stale token detected', { 
        tokenRotation: decoded.rotationCount, 
        sessionRotation: session.rotationCount,
        studentId 
      })
      return res.status(400).json({ success: false, message: 'QR code expired. Please use the latest code from teacher.' })
    }

    // Check session expiration time
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      console.warn('[attendance] Session expired', { qrSessionId, expiresAt: session.expiresAt })
      return res.status(410).json({ success: false, message: 'Attendance session has expired' })
    }

    // SECURITY: Prevent duplicate scans for same session/lecture/student
    const existing = await Attendance.findOne({ 
      qrSession: qrSessionId, 
      lectureId: decoded.lectureId, 
      student: studentId 
    })
    if (existing) {
      console.warn('[attendance] Duplicate scan attempt', { studentId, lectureId: decoded.lectureId, timestamp: existing.timestamp })
      return res.status(409).json({ success: false, message: 'You have already marked attendance for this lecture' })
    }

    // Fetch full student info for logging
    const student = await User.findById(studentId)
    
    // Create attendance record
    const attendance = new Attendance({
      student: studentId,
      teacher: session.teacher,
      subject: session.subject,
      lectureId: decoded.lectureId,
      qrSession: qrSessionId,
      timestamp: new Date(),
      status: 'present',
      deviceInfo: deviceInfo || {},
      ipAddress: req.ip,
      location: location || null
    })

    await attendance.save()

    // Log successful attendance
    console.log('[attendance] Success', {
      studentId,
      studentName: student?.name,
      lectureId: decoded.lectureId,
      qrSessionId,
      timestamp: new Date().toISOString()
    })

    // Emit realtime events to notify teacher/other clients
    const io = getIO()
    if (io) {
      // Populate student info for real-time update
      const populatedAttendance = await Attendance.findById(attendance._id).populate('student', 'name collegeId email')
      
      io.to(`qr_${qrSessionId}`).emit('attendance:marked', { 
        attendance: populatedAttendance 
      })
      io.to(`lecture_${decoded.lectureId}`).emit('attendance:stats:update', { 
        lectureId: decoded.lectureId,
        studentId,
        studentName: student?.name
      })
    }

    return res.status(201).json({ 
      success: true, 
      message: 'Attendance marked successfully',
      attendance: {
        _id: attendance._id,
        timestamp: attendance.timestamp,
        lectureId: attendance.lectureId
      }
    })
  } catch (error) {
    console.error('[attendance] scan error', error)
    return res.status(500).json({ success: false, message: 'Error marking attendance' })
  }
}

export const getSessionAttendance = async (req, res) => {
  try {
    const { id } = req.params
    const records = await Attendance.find({ qrSession: id }).populate('student', 'name email collegeId')
    return res.status(200).json({ success: true, count: records.length, records })
  } catch (error) {
    console.error('[attendance] getSessionAttendance error', error)
    return res.status(500).json({ success: false, message: 'Error fetching attendance records' })
  }
}

export const getStats = async (req, res) => {
  try {
    const { lectureId } = req.query
    const match = lectureId ? { lectureId } : {}
    const total = await Attendance.countDocuments(match)
    // grouped counts per lecture
    const grouped = await Attendance.aggregate([
      { $match: match },
      { $group: { _id: '$lectureId', count: { $sum: 1 } } }
    ])
    return res.status(200).json({ success: true, total, grouped })
  } catch (error) {
    console.error('[attendance] getStats error', error)
    return res.status(500).json({ success: false, message: 'Error fetching stats' })
  }
}
