// models/QRSession.js
import mongoose from 'mongoose'

const qrSessionSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  lectureId: { type: String, required: true, index: true },
  active: { type: Boolean, default: true },
  rotationCount: { type: Number, default: 0 },
  // session-level expiry (optional) - when the teacher ends attendance or after long timeout
  expiresAt: { type: Date, default: null, index: true },
  // optional meta
  meta: { type: Object, default: {} }
}, { timestamps: true })

qrSessionSchema.index({ lectureId: 1 })

export default mongoose.model('QRSession', qrSessionSchema)

