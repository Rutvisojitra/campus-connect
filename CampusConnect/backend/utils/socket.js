// utils/socket.js
// Initialize Socket.IO handlers for realtime features

export default function initSocket(io) {
  io.on('connection', (socket) => {
    console.log('[socket] Client connected:', socket.id)

    // Join named rooms (e.g., classroom, user, department)
    socket.on('joinRoom', (room) => {
      socket.join(room)
      console.log(`[socket] ${socket.id} joined room ${room}`)
    })

    // Leave room
    socket.on('leaveRoom', (room) => {
      socket.leave(room)
      console.log(`[socket] ${socket.id} left room ${room}`)
    })

    // Attendance scan event from student device
    socket.on('attendance:scan', (payload) => {
      // payload should include { qrSessionId, studentId, token }
      console.log('[socket] attendance:scan payload', payload)
      // Broadcast to teacher/admin for realtime update
      if (payload && payload.qrSessionId) {
        io.to(`qr_${payload.qrSessionId}`).emit('attendance:update', payload)
      }
    })

    // Chat messaging
    socket.on('chat:message', (msg) => {
      // msg should include { room, from, text }
      if (msg?.room) {
        io.to(msg.room).emit('chat:message', msg)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] Client disconnected:', socket.id, 'reason:', reason)
    })
  })

  return io
}
