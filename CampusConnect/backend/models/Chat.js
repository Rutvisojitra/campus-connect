// models/Chat.js
import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toRoom: { type: String },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String },
  attachments: [String],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

export default mongoose.model('Message', messageSchema)
