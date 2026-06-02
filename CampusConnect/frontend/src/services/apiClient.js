import axios from 'axios'

// Support both Vite environment variables and standard React App environment variables.
// If no API URL is configured, use a relative /api path so the frontend works with Vite proxy
// during local development and same-origin deployment in production.
const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || ''
const defaultApiUrl = rawApiUrl.trim() || '/api'
const normalizedApiUrl = defaultApiUrl.replace(/\/+$/g, '').trim()
const API_BASE_URL = normalizedApiUrl.startsWith('/')
  ? normalizedApiUrl
  : normalizedApiUrl.endsWith('/api')
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api`

console.log('[api] Initializing API Client with base URL:', API_BASE_URL)

const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT || 10000)

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request Interceptor: Attach JWT Token automatically if it exists
api.interceptors.request.use(
  (config) => {
    // If frontend has detected server is offline, short-circuit safe requests
    if (window.__SERVER_ONLINE === false) {
      const err = new Error('Server offline')
      err.code = 'SERVER_OFFLINE'
      return Promise.reject(err)
    }

    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Capture connection/CORS errors instantly to activate offline mode
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network errors or no response -> backend unreachable
    if (!error.response) {
      console.warn('[api] Network or CORS error. Dispatching offline state.', error.message)
      window.dispatchEvent(new CustomEvent('api-offline'))
      return Promise.reject({ success: false, message: 'Server unreachable', code: 'SERVER_OFFLINE' })
    }

    // If backend returns 503 or 502 -> treat as server offline
    if ([502, 503, 504].includes(error.response.status)) {
      console.warn('[api] Backend returned server error. Marking offline:', error.response.status)
      window.dispatchEvent(new CustomEvent('api-offline'))
      return Promise.reject(error.response.data || { success: false, message: 'Server error' })
    }

    // Token invalid or expired
    if (error.response.status === 401) {
      window.dispatchEvent(new CustomEvent('api-token-invalid'))
      return Promise.reject(error.response.data || { success: false, message: 'Unauthorized' })
    }

    return Promise.reject(error.response?.data || { success: false, message: error.message })
  }
)


const authService = {
  testBackend: async () => {
    try {
      // Prefer the health endpoint for robust status checks
      const response = await api.get('/health')
      return response.data
    } catch (error) {
      throw error.response?.data || {
        message: `Cannot reach backend at ${API_BASE_URL}. Check that Express is running and CORS is configured.`
      }
    }
  },

  // Login
  login: async (identifier, password, rememberMe = false, role = null) => {
    try {
      const response = await api.post('/auth/login', {
        identifier,
        password,
        rememberMe,
        role
      })
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
          localStorage.setItem('identifier', identifier)
        } else {
          localStorage.removeItem('rememberMe')
          localStorage.removeItem('identifier')
        }
      }
      
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' }
    }
  },

  // Signup / Register
  signup: async (userData) => {
    try {
      console.log('[api] Register request:', {
        url: `${API_BASE_URL}/auth/register`,
        role: userData.role,
        email: userData.email,
        collegeId: userData.collegeId
      })
      const response = await api.post('/auth/register', userData)
      return response.data
    } catch (error) {
      console.error('[api] Register failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })

      if (error.response?.data) {
        throw error.response.data
      }

      if (error.request) {
        throw {
          success: false,
          message: `Cannot reach backend at ${API_BASE_URL}. Check that Express is running and CORS is configured.`
        }
      }

      throw {
        success: false,
        message: error.message || 'Unable to send signup request'
      }
    }
  },

  // Change Password
  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      })
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user))
      }
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Change password failed' }
    }
  },

  // Get User Profile
  getUserProfile: async () => {
    try {
      const response = await api.get('/auth/profile')
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Get profile failed' }
    }
  },

  // Get current logged in user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Failed to restore user session' }
    }
  },

  // Logout
  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.warn('[api] Logout endpoint failed', error?.message)
    }

    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    localStorage.removeItem('identifier')
  },

  // Get local user data
  getLocalUser: () => {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  // Check if logged in
  isLoggedIn: () => {
    return !!localStorage.getItem('token')
  },

  // Get token
  getToken: () => {
    return localStorage.getItem('token')
  },

  // Admin: Get all users
  getAllUsers: async () => {
    try {
      const response = await api.get('/auth/users')
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Get users failed' }
    }
  },

  addUser: async (userData) => {
    try {
      const response = await api.post('/auth/users', userData)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Add user failed' }
    }
  },

  // Admin: Update user
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/auth/users/${userId}`, userData)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Update user failed' }
    }
  },

  // Attendance: Start a live session
  startAttendance: async (payload) => {
    try {
      const response = await api.post('/attendance/start', payload)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Start attendance failed' }
    }
  },

  // Attendance: End the current session
  endAttendance: async (sessionId) => {
    try {
      const response = await api.post('/attendance/end', { sessionId })
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'End attendance failed' }
    }
  },

  // Attendance: Scan a QR payload
  scanAttendance: async (payload) => {
    try {
      const response = await api.post('/attendance/scan', payload)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Scan attendance failed' }
    }
  },

  // Attendance: Fetch a session attendance roster
  getSessionAttendance: async (sessionId) => {
    try {
      const response = await api.get(`/attendance/session/${sessionId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Get session attendance failed' }
    }
  },

  // Attendance: Session metadata
  getSessionMeta: async (sessionId) => {
    try {
      const response = await api.get(`/attendance/session-meta/${sessionId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Get session metadata failed' }
    }
  },

  // Attendance: Summary stats
  getAttendanceStats: async (lectureId) => {
    try {
      const response = await api.get(`/attendance/stats?lectureId=${encodeURIComponent(lectureId || '')}`)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Get attendance stats failed' }
    }
  },

  // Admin: Reset password
  resetPassword: async (userId, newPassword) => {
    try {
      const response = await api.post(`/auth/users/${userId}/reset-password`, {
        newPassword
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Reset password failed' }
    }
  },

  // Admin: Delete user
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/auth/users/${userId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || { message: 'Delete user failed' }
    }
  }
}

export default authService
