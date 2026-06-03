import axios from 'axios'

// Support both Vite environment variables and standard React App environment variables.
// If no API URL is configured, use a relative /api path so the frontend works with Vite proxy
// during local development and same-origin deployment in production.
const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || ''
const hasConfiguredApiUrl = Boolean(rawApiUrl.trim())
const apiUnavailableInProduction = !import.meta.env.DEV && !hasConfiguredApiUrl
const defaultApiUrl = rawApiUrl.trim() || '/api'
const normalizedApiUrl = defaultApiUrl.replace(/\/+$/g, '').trim()
const API_BASE_URL = normalizedApiUrl.startsWith('/')
  ? normalizedApiUrl
  : normalizedApiUrl.endsWith('/api')
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api`

console.log('[api] Initializing API Client with base URL:', API_BASE_URL)

const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT || 10000)
const LOCAL_USERS_KEY = 'campusconnect_static_users'

const buildApiNotConfiguredError = () => {
  const err = new Error(
    'Signup requires a live backend. Configure VITE_API_URL for this deployment before creating accounts.'
  )
  err.code = 'API_NOT_CONFIGURED'
  err.success = false
  return err
}

const getLocalUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || []
  } catch {
    return []
  }
}

const saveLocalUsers = (users) => {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
}

const toPublicLocalUser = (user) => ({
  _id: user._id,
  userId: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  collegeId: user.collegeId || null,
  department: user.department,
  semester: user.semester,
  firstLogin: false,
  isActive: true,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
})

const createLocalToken = (userId) => `static-${userId}-${Date.now()}`

const staticAuth = {
  signup: async (userData) => {
    const users = getLocalUsers()
    const email = (userData.email || '').trim().toLowerCase()
    const collegeId = (userData.collegeId || '').trim().toLowerCase()

    if (users.some((user) => user.email === email || (collegeId && user.collegeId === collegeId))) {
      throw { success: false, message: 'User already registered' }
    }

    const now = new Date().toISOString()
    const user = {
      _id: `local-${Date.now()}`,
      name: (userData.name || '').trim(),
      email,
      password: userData.password,
      collegeId,
      role: userData.role || 'student',
      department: userData.department || 'CSE',
      semester: userData.semester,
      createdAt: now,
      updatedAt: now
    }

    users.push(user)
    saveLocalUsers(users)

    return {
      success: true,
      message: 'Account created locally for this browser.',
      token: createLocalToken(user._id),
      user: toPublicLocalUser(user)
    }
  },

  login: async (identifier, password, rememberMe = false, role = null) => {
    const normalizedIdentifier = (identifier || '').trim().toLowerCase()
    const user = getLocalUsers().find((item) => (
      item.email === normalizedIdentifier || item.collegeId === normalizedIdentifier
    ))

    if (!user) {
      throw { success: false, message: 'Account not found. Please register first.', code: 'ACCOUNT_NOT_FOUND' }
    }

    if (role && user.role !== role) {
      throw { success: false, message: 'This account is not registered for the selected role' }
    }

    if (user.password !== password) {
      throw { success: false, message: 'Invalid email or password' }
    }

    return {
      success: true,
      message: 'Login successful.',
      token: createLocalToken(user._id),
      user: toPublicLocalUser(user)
    }
  },

  getCurrentUser: async () => {
    const localUser = localStorage.getItem('user')
    if (!localUser) {
      throw { success: false, message: 'No local user session' }
    }

    return { success: true, user: JSON.parse(localUser) }
  }
}

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
    if (apiUnavailableInProduction) {
      return Promise.reject(buildApiNotConfiguredError())
    }

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

// Response Interceptor: Retry transient failures then capture connection/CORS errors to activate offline mode
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {}
    const status = error.response?.status

    // Do not retry auth or validation failures.
    if ([400, 401, 403, 404].includes(status)) {
      return Promise.reject(error)
    }

    // Do not retry file uploads.
    if (config && config.data instanceof FormData) {
      return Promise.reject(error)
    }

    // Retry transient errors only: network failures, 429, or server errors.
    const retryable = !error.response || [429, 502, 503, 504].includes(status)

    if (retryable) {
      const MAX_RETRIES = Number(import.meta.env.VITE_API_MAX_RETRIES || 3)
      config.__retryCount = config.__retryCount || 0

      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1
        const backoff = Math.min(1000 * 2 ** config.__retryCount, 10000)
        const jitter = Math.random() * 500
        const delay = backoff + jitter

        console.debug(`[api] Retry #${config.__retryCount} after ${Math.round(delay)}ms for`, config.url)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return api(config)
      }
    }

    // Network errors or no response -> backend unreachable
    if (!error.response) {
      console.warn('[api] Network or CORS error. Dispatching offline state.', error.message)
      window.dispatchEvent(new CustomEvent('api-offline'))
      return Promise.reject({ success: false, message: 'Server unreachable', code: 'SERVER_OFFLINE' })
    }

    // If backend returns 503 or 502 -> treat as server offline
    if ([502, 503, 504].includes(status)) {
      console.warn('[api] Backend returned server error. Marking offline:', status)
      window.dispatchEvent(new CustomEvent('api-offline'))
      return Promise.reject(error.response.data || { success: false, message: 'Server error' })
    }

    // Token invalid or expired
    if (status === 401) {
      window.dispatchEvent(new CustomEvent('api-token-invalid'))
      return Promise.reject(error.response.data || { success: false, message: 'Unauthorized' })
    }

    return Promise.reject(error.response?.data || { success: false, message: error.message })
  }
)

const buildApiError = (error, fallbackMessage) => {
  const payload = error?.response?.data || error || {}
  const message = payload?.message || payload?.error || error?.message || fallbackMessage
  const err = new Error(message)
  err.code = payload?.code || error?.code
  err.status = payload?.status || error?.status || error?.response?.status
  err.request = error?.request
  err.response = error?.response
  return err
}

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
    if (apiUnavailableInProduction) {
      return staticAuth.login(identifier, password, rememberMe, role)
    }

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
    if (apiUnavailableInProduction) {
      return staticAuth.signup(userData)
    }

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
        message: error.message,
        code: error.code
      })

      if (error.code === 'API_NOT_CONFIGURED') {
        throw {
          success: false,
          message: error.message,
          code: error.code
        }
      }

      if (error.response?.data) {
        throw error.response.data
      }

      if (error.request) {
        if (!import.meta.env.DEV) {
          console.warn('[api] Backend unreachable during signup. Falling back to static local account.')
          return staticAuth.signup(userData)
        }

        throw {
          success: false,
          message: `Cannot reach backend at ${API_BASE_URL}. Check that Express is running and CORS is configured.`
        }
      }

      throw {
        success: false,
        message: error.message || 'Signup request could not be sent. Please check the backend connection.'
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
    if (apiUnavailableInProduction) {
      return staticAuth.getCurrentUser()
    }

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
      throw buildApiError(error, 'Start attendance failed')
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
