import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import authService from '../services/apiClient'
import { useServerStatus } from './ServerStatusContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    // If the frontend has detected server is offline, don't attempt immediate logout.
    if (window.__SERVER_ONLINE === false) {
      // Restore from local cache if available and wait for recovery
      const cached = authService.getLocalUser()
      if (cached) setUser(cached)
      setLoading(false)
      return
    }

    try {
      const response = await authService.getCurrentUser()
      if (response && response.success) {
        setUser(response.user)
        localStorage.setItem('user', JSON.stringify(response.user))
      } else {
        await authService.logout()
        setUser(null)
      }
    } catch (error) {
      if (error && error.code === 'SERVER_OFFLINE') {
        const cached = authService.getLocalUser()
        if (cached) setUser(cached)
      } else {
        console.warn('[auth] Failed to restore session:', error)
        await authService.logout()
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    restoreSession()

    // Listen for backend recovery events to refresh session
    const onRecovered = async () => {
      try {
        const refreshed = await authService.getCurrentUser()
        if (refreshed && refreshed.success) {
          setUser(refreshed.user)
          localStorage.setItem('user', JSON.stringify(refreshed.user))
        }
      } catch (err) {
        console.warn('[auth] refresh after recovery failed', err)
      }
    }

    const onTokenInvalid = () => {
      // Token was rejected by backend - force logout to clear bad token
      logout()
    }

    window.addEventListener('api-recovered', onRecovered)
    window.addEventListener('api-token-invalid', onTokenInvalid)

    return () => {
      window.removeEventListener('api-recovered', onRecovered)
      window.removeEventListener('api-token-invalid', onTokenInvalid)
    }
  }, [restoreSession])

  const login = async (identifier, password, rememberMe = false, role = null) => {
    setAuthError(null)
    try {
      const response = await authService.login(identifier, password, rememberMe, role)
      if (response.success && response.token) {
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
          localStorage.setItem('identifier', identifier)
        } else {
          localStorage.removeItem('rememberMe')
          localStorage.removeItem('identifier')
        }
        setUser(response.user)
      }
      return response
    } catch (error) {
      setAuthError(error.message || 'Login failed')
      throw error
    }
  }

  const register = async (payload) => {
    setAuthError(null)
    try {
      const response = await authService.signup(payload)
      if (response.success && response.token) {
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        if (payload.rememberMe) {
          localStorage.setItem('rememberMe', 'true')
          localStorage.setItem('identifier', payload.email || payload.collegeId || '')
        }
        setUser(response.user)
      }
      return response
    } catch (error) {
      setAuthError(error.message || 'Registration failed')
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.warn('[auth] logout failed:', error)
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    localStorage.removeItem('identifier')
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const response = await authService.getCurrentUser()
      if (response.success) {
        setUser(response.user)
        localStorage.setItem('user', JSON.stringify(response.user))
        return response.user
      }
    } catch (error) {
      console.warn('[auth] refreshUser failed', error)
      await logout()
    }
    return null
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
    if (updatedUser) {
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }

  const value = useMemo(() => ({
    user,
    loading,
    authError,
    login,
    register,
    logout,
    refreshUser,
    updateUser,
    isAuthenticated: Boolean(user)
  }), [user, loading, authError])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
