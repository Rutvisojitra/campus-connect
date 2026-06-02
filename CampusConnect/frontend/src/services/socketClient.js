import { io } from 'socket.io-client'

const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || ''
const normalizedApiUrl = rawApiUrl.trim().replace(/\/+$|\/$/g, '')
const API_BASE_URL = normalizedApiUrl || '/api'
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '')

export const createSocket = () => {
  const token = localStorage.getItem('token')
  return io(SOCKET_URL, {
    autoConnect: false,
    path: '/socket.io',
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    timeout: 10000
  })
}

export default { createSocket }
