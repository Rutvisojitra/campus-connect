// controllers/qrController.js
import mongoose from 'mongoose'
import QRSession from '../models/QRSession.js'
import Subject from '../models/Subject.js'
import { startRotation, stopRotation, generateQrToken, rotateNow } from '../utils/qrManager.js'
import { getIO } from '../utils/socketServer.js'

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Start attendance: create a QRSession and begin rotating tokens
 * POST /api/attendance/start
 * Session duration defaults to 45 minutes
 * QR token rotates every 15 seconds for security
 */
export const startAttendance = async (req, res) => {
  try {
    const teacherId = req.user.userId
    let { subjectId, lectureId, subjectName, durationMinutes } = req.body

    if (!subjectId || !lectureId) return res.status(400).json({ success: false, message: 'subjectId and lectureId required' })

    // Default to 45-minute session if not specified
    if (!durationMinutes || durationMinutes < 5) {
      durationMinutes = 45
      console.log('[qr] Using default 45-minute session duration')
    }

    let subject = null
    const normalizedSubjectId = typeof subjectId === 'string' ? subjectId.trim() : subjectId
    const normalizedSubjectName = typeof subjectName === 'string' ? subjectName.trim() : ''

    if (mongoose.isValidObjectId(normalizedSubjectId)) {
      subject = await Subject.findById(normalizedSubjectId)
    }

    if (!subject) {
      subject = await Subject.findOne({ code: normalizedSubjectId })
    }

    if (!subject) {
      subject = await Subject.findOne({ code: new RegExp(`^${escapeRegExp(normalizedSubjectId)}$`, 'i') })
    }

    if (!subject) {
      subject = await Subject.findOne({ name: new RegExp(`^${escapeRegExp(normalizedSubjectId)}$`, 'i') })
    }

    if (!subject && normalizedSubjectName) {
      subject = await Subject.findOne({ name: new RegExp(`^${escapeRegExp(normalizedSubjectName)}$`, 'i') })
    }

    if (!subject) {
      const newSubject = new Subject({
        code: normalizedSubjectId,
        name: normalizedSubjectName || normalizedSubjectId,
        teacher: teacherId
      })
      await newSubject.save()
      subject = newSubject
      console.log('[qr] Auto-created subject for attendance:', subject.code, subject.name)
    }

    subjectId = subject._id

    // Create session with calculated expiration
    const expiresAt = new Date(Date.now() + durationMinutes * 60000)
    const session = new QRSession({ 
      teacher: teacherId, 
      subject: subjectId, 
      lectureId, 
      active: true, 
      rotationCount: 0,
      expiresAt 
    })
    await session.save()

    console.log('[qr] Session created', {
      sessionId: session._id,
      lectureId,
      duration: durationMinutes,
      expiresAt: expiresAt.toISOString()
    })

    // Start rotating tokens - rotation happens every 15 seconds
    await startRotation(session)

    // Return the initial token
    const rotation = await rotateNow(session._id.toString())

    const io = getIO()
    if (io) {
      io.to(`qr_${session._id.toString()}`).emit('attendance:started', { 
        qrSessionId: session._id.toString(), 
        lectureId, 
        token: rotation?.token, 
        expiresAt: rotation?.expiresAt,
        rotationCount: rotation?.rotationCount,
        sessionDuration: durationMinutes
      })
    }

    return res.status(201).json({ 
      success: true, 
      message: 'Attendance session started', 
      qrSessionId: session._id, 
      token: rotation?.token, 
      expiresAt: session.expiresAt,
      rotationCount: rotation?.rotationCount,
      sessionDuration: durationMinutes,
      sessionDetails: {
        lectureId,
        subjectName: subject.name,
        rotationIntervalSeconds: 15
      }
    })
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
