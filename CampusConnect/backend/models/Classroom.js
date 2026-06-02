// models/Classroom.js
import mongoose from 'mongoose'

const classroomSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  location: { type: String },
  capacity: { type: Number, default: 60 },
  meta: { type: Object, default: {} }
}, { timestamps: true })

export default mongoose.model('Classroom', classroomSchema)
