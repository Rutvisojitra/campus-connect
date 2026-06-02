import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import authService from '../services/apiClient'

const ServerStatusContext = createContext({
  isOnline: true,
  isChecking: false,
  checkConnection: async () => {}
})

export const useServerStatus = () => useContext(ServerStatusContext)

export const ServerStatusProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true)
  const [isChecking, setIsChecking] = useState(false)

  // Expose a global flag to allow apiClient to short-circuit requests when offline
  useEffect(() => {
    window.__SERVER_ONLINE = isOnline
  }, [isOnline])

  // Get active API URL from env or fallback to a relative /api path.
  // Relative /api works with Vite proxy and same-origin deployments.
  const getApiUrl = () => {
    const rawUrl = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || ''
    const trimmed = rawUrl.trim()
    if (!trimmed) {
      return '/api'
    }

    const normalized = trimmed.replace(/\/+$/g, '').trim()
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`
  }

  const checkConnection = async () => {
    if (isChecking) return
    setIsChecking(true)
    const activeUrl = getApiUrl()

    try {
      // Ping the explicit health check endpoint
      const resp = await axios.get(`${activeUrl}/health`, {
        timeout: 2500, // Timeout after 2.5 seconds
      })

      const data = resp?.data

      // Log health response for debugging connectivity issues
      // (helps diagnose recurring false offline detections)
      console.debug('[server-monitor] Health response:', resp?.status, data)

      // Consider backend online if it responds successfully.
      // Some dev setups run without a DB connected; treat a successful HTTP response
      // or `success: true` from the API as backend being reachable.
      const healthy = (resp && resp.status === 200) || (data && data.success)

      if (healthy) {
        // If previously offline, notify recovery
        if (!isOnline) {
          window.dispatchEvent(new CustomEvent('api-online'))
          window.dispatchEvent(new CustomEvent('api-recovered'))
        }
        setIsOnline(true)
      } else {
        console.warn('[server-monitor] Backend health check indicates DB disconnected or non-atlas deployment:', data)
        setIsOnline(false)
        window.dispatchEvent(new CustomEvent('api-offline'))
      }
    } catch (error) {
      // If it fails (Network Error, timeout, etc.), set offline
      console.warn('[server-monitor] Failed to reach backend at:', activeUrl, error.message)
      setIsOnline(false)
      window.dispatchEvent(new CustomEvent('api-offline'))
    } finally {
      setIsChecking(false)
    }
  }

  // Effect to handle periodic reconnect attempts when offline
  useEffect(() => {
    let intervalId = null

    if (!isOnline) {
      console.log('[server-monitor] Backend is offline. Retrying every 3 seconds...')
      // Reconnect retry loop: check connection every 3 seconds
      intervalId = setInterval(() => {
        checkConnection()
      }, 3000)
    } else {
      // Regular background health-check ping every 10 seconds to ensure status is up to date
      intervalId = setInterval(() => {
        checkConnection()
      }, 10000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isOnline])

  // Initial check on mount
  useEffect(() => {
    checkConnection()
    
    // Bind to custom event from apiClient to trigger offline state immediately on request failure
    const handleApiOffline = () => {
      setIsOnline(false)
    }
    
    window.addEventListener('api-offline', handleApiOffline)
    return () => {
      window.removeEventListener('api-offline', handleApiOffline)
    }
  }, [])

  return (
    <ServerStatusContext.Provider value={{ isOnline, isChecking, checkConnection }}>
      {children}
    </ServerStatusContext.Provider>
  )
}
