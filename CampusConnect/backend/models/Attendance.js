// models/Attendance.js
// ============================================================
// Attendance Model - Track student attendance
// ============================================================

import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  lectureId: { type: String, required: true, index: true },
  qrSession: { type: mongoose.Schema.Types.ObjectId, ref: 'QRSession', required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['present','absent','late'], default: 'present' },
  deviceInfo: { type: Object, default: {} },
  ipAddress: { type: String },
  location: { type: Object, default: null }
}, { timestamps: true })

attendanceSchema.index({ lectureId: 1, student: 1, qrSession: 1 }, { unique: false })

export default mongoose.model('Attendance', attendanceSchema)
