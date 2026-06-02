// controllers/qrController.js
import QRSession from '../models/QRSession.js'
import Subject from '../models/Subject.js'
import { startRotation, stopRotation, generateQrToken, rotateNow } from '../utils/qrManager.js'
import { getIO } from '../utils/socketServer.js'

/**
 * Start attendance: create a QRSession and begin rotating tokens
 */
export const startAttendance = async (req, res) => {
  try {
    const teacherId = req.user.userId
    const { subjectId, lectureId, durationMinutes } = req.body

    if (!subjectId || !lectureId) return res.status(400).json({ success: false, message: 'subjectId and lectureId required' })

    const subject = await Subject.findById(subjectId)
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' })

    // Create session
    const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60000) : null
    const session = new QRSession({ teacher: teacherId, subject: subjectId, lectureId, active: true, expiresAt })
    await session.save()

    // start rotating tokens for this session (rotateNow is invoked by startRotation immediately)
    await startRotation(session)

    // Provide the most recent token to the starter by rotating now and returning the token
    const rotation = await rotateNow(session._id.toString())

    const io = getIO()
    if (io) {
      io.to(`qr_${session._id.toString()}`).emit('attendance:started', { qrSessionId: session._id.toString(), lectureId, token: rotation?.token, expiresAt: rotation?.expiresAt })
    }

    return res.status(201).json({ success: true, message: 'Attendance session started', qrSessionId: session._id, token: rotation?.token, expiresAt: session.expiresAt })
  } catch (error) {
    console.error('[qr] startAttendance error', error)
    return res.status(500).json({ success: false, message: 'Error starting attendance' })
  }
}

export const rotateQr = async (req, res) => {
  try {
    const { sessionId } = req.params
    const result = await rotateNow(sessionId)
    if (!result) return res.status(404).json({ success: false, message: 'Session not found or inactive' })
    return res.status(200).json({ success: true, token: result.token, expiresAt: result.expiresAt, rotationCount: result.rotationCount })
  } catch (error) {
    console.error('[qr] rotate error', error)
    return res.status(500).json({ success: false, message: 'Error rotating QR' })
  }
}

export const endAttendance = async (req, res) => {
  try {
    const { sessionId } = req.body
    const session = await QRSession.findById(sessionId)
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' })
    session.active = false
    await session.save()

    stopRotation(sessionId)

    const io = getIO()
    if (io) {
      io.to(`qr_${sessionId}`).emit('attendance:closed', { qrSessionId: sessionId })
      io.to(`lecture_${session.lectureId}`).emit('attendance:closed', { qrSessionId: sessionId })
    }

    return res.status(200).json({ success: true, message: 'Attendance session ended' })
  } catch (error) {
    console.error('[qr] endAttendance error', error)
    return res.status(500).json({ success: false, message: 'Error ending attendance' })
  }
}

export const getSession = async (req, res) => {
  try {
    const { id } = req.params
    const session = await QRSession.findById(id).populate('teacher subject')
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' })
    return res.status(200).json({ success: true, session })
  } catch (error) {
    console.error('[qr] getSession error', error)
    return res.status(500).json({ success: false, message: 'Error fetching session' })
  }
}
