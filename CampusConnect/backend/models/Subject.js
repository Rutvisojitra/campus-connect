// models/Subject.js
import mongoose from 'mongoose'

const subjectSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  department: { type: String, default: 'CSE' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

export default mongoose.model('Subject', subjectSchema)
