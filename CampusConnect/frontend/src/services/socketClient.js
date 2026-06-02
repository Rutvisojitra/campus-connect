import { io } from 'socket.io-client'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '')

export const createSocket = () => {
  const token = localStorage.getItem('token')
  return io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    timeout: 10000
  })
}

export default { createSocket }
