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
 */
export const scanAttendance = async (req, res) => {
  try {
    const studentId = req.user.userId
    const { qrSessionId, token, deviceInfo, location } = req.body

    if (!qrSessionId || !token) return res.status(400).json({ success: false, message: 'qrSessionId and token required' })

    // Verify token
    const { valid, decoded, reason } = verifyQrToken(token)
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid or expired QR token' })

    // Sanity checks
    if (decoded.qrSessionId !== qrSessionId) return res.status(400).json({ success: false, message: 'QR token does not match session' })

    const session = await QRSession.findById(qrSessionId)
    if (!session || !session.active) return res.status(410).json({ success: false, message: 'QR session inactive or closed' })

    // rotation validation: ensure token rotationCount matches current session rotation
    if (decoded.rotationCount !== session.rotationCount) return res.status(400).json({ success: false, message: 'QR token rotation mismatch (stale token)' })

    // Prevent duplicate scans for same lecture
    const existing = await Attendance.findOne({ qrSession: qrSessionId, lectureId: decoded.lectureId, student: studentId })
    if (existing) return res.status(409).json({ success: false, message: 'Attendance already recorded' })

    // Create attendance
    const attendance = new Attendance({
      student: studentId,
      teacher: session.teacher,
      subject: session.subject,
      lectureId: decoded.lectureId,
      qrSession: qrSessionId,
      timestamp: new Date(),
      deviceInfo: deviceInfo || {},
      ipAddress: req.ip,
      location: location || null
    })

    await attendance.save()

    // Emit realtime event to teacher/dashboard
    const io = getIO()
    if (io) {
      io.to(`qr_${qrSessionId}`).emit('attendance:marked', { attendance: attendance.getPublicFields ? attendance.getPublicFields() : attendance })
      io.to(`lecture_${decoded.lectureId}`).emit('attendance:stats:update', { lectureId: decoded.lectureId })
    }

    return res.status(201).json({ success: true, message: 'Attendance marked' })
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
