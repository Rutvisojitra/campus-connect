// utils/qrManager.js
import jwt from 'jsonwebtoken'
import { getIO } from './socketServer.js'
import QRSession from '../models/QRSession.js'

const QR_SECRET = process.env.QR_JWT_SECRET || process.env.JWT_SECRET || 'qr-secret'
const TOKEN_TTL_SECONDS = Number(process.env.QR_TOKEN_TTL_SECONDS) || 60
const ROTATION_INTERVAL_MS = Number(process.env.QR_ROTATION_MS) || 15000

// In-memory map of sessionId -> { intervalId }
const activeRotations = new Map()

export const generateQrToken = ({ lectureId, teacherId, subjectId, qrSessionId, rotationCount }) => {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + TOKEN_TTL_SECONDS
  const payload = { lectureId, teacherId, subjectId, qrSessionId, rotationCount, iat: issuedAt, exp: expiresAt }
  const token = jwt.sign(payload, QR_SECRET)
  return { token, payload, expiresAt }
}

export const verifyQrToken = (token) => {
  try {
    const decoded = jwt.verify(token, QR_SECRET)
    return { valid: true, decoded }
  } catch (err) {
    return { valid: false, reason: err.message }
  }
}

export const startRotation = async (qrSession) => {
  if (!qrSession || !qrSession._id) return
  const sessionId = qrSession._id.toString()
  // clear if exists
  stopRotation(sessionId)

  // create initial rotation token and broadcast
  await rotateNow(sessionId)

  const intervalId = setInterval(() => {
    rotateNow(sessionId).catch(err => console.error('[qrManager] rotate error', err))
  }, ROTATION_INTERVAL_MS)

  activeRotations.set(sessionId, { intervalId })
}

export const stopRotation = (sessionId) => {
  const entry = activeRotations.get(sessionId)
  if (entry && entry.intervalId) clearInterval(entry.intervalId)
  activeRotations.delete(sessionId)
}

export const rotateNow = async (sessionId) => {
  const session = await QRSession.findById(sessionId)
  if (!session || !session.active) return

  // increment rotationCount atomically
  session.rotationCount = (session.rotationCount || 0) + 1
  await session.save()

  const { token, payload, expiresAt } = generateQrToken({
    lectureId: session.lectureId,
    teacherId: session.teacher.toString(),
    subjectId: session.subject.toString(),
    qrSessionId: session._id.toString(),
    rotationCount: session.rotationCount
  })

  const io = getIO()
  // Broadcast to room dedicated to this qr session
  if (io) {
    io.to(`qr_${session._id.toString()}`).emit('qr:rotated', { token, expiresAt, rotationCount: session.rotationCount })
    io.to(`lecture_${session.lectureId}`).emit('qr:rotated', { token, expiresAt, rotationCount: session.rotationCount })
  }

  return { token, payload, expiresAt, rotationCount: session.rotationCount }
}

export default { generateQrToken, verifyQrToken, startRotation, stopRotation, rotateNow }
