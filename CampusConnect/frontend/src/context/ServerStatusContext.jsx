import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const ServerStatusContext = createContext({
  isOnline: true,
  isChecking: false,
  dbConnected: true,
  networkOnline: true,
  checkConnection: async () => {}
})

export const useServerStatus = () => useContext(ServerStatusContext)

export const ServerStatusProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [dbConnected, setDbConnected] = useState(true)
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine)

  useEffect(() => {
    window.__SERVER_ONLINE = isOnline
    window.__SERVER_DB_CONNECTED = dbConnected
    window.__NETWORK_ONLINE = networkOnline
  }, [isOnline, dbConnected, networkOnline])

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
      const resp = await axios.get(`${activeUrl}/health`, {
        timeout: 2500
      })

      const data = resp?.data
      console.debug('[server-monitor] Health response:', resp?.status, data)

      const isRateLimited = resp?.status === 429
      const healthy = resp?.status === 200 || isRateLimited || (data && data.success)

      if (healthy) {
        if (isRateLimited) {
          console.warn('[server-monitor] Health endpoint rate-limited, backend is reachable')
        }

        if (!isOnline) {
          window.dispatchEvent(new CustomEvent('api-online'))
          window.dispatchEvent(new CustomEvent('api-recovered'))
        }
        setIsOnline(true)

        if (data && data.database && typeof data.database.connected === 'boolean') {
          setDbConnected(Boolean(data.database.connected))
          if (!data.database.connected) {
            window.dispatchEvent(new CustomEvent('api-db-disconnected'))
          } else {
            window.dispatchEvent(new CustomEvent('api-db-recovered'))
          }
        } else {
          setDbConnected(true)
        }
      } else {
        console.warn('[server-monitor] Backend health check indicates unhealthy payload:', data)
        setIsOnline(false)
        window.dispatchEvent(new CustomEvent('api-offline'))
      }
    } catch (error) {
      console.warn('[server-monitor] Failed to reach backend at:', activeUrl, error.message)
      setIsOnline(false)
      window.dispatchEvent(new CustomEvent('api-offline'))
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    let intervalId = null

    if (!isOnline) {
      console.log('[server-monitor] Backend is offline. Retrying every 3 seconds...')
      intervalId = setInterval(() => {
        checkConnection()
      }, 3000)
    } else {
      intervalId = setInterval(() => {
        checkConnection()
      }, 10000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isOnline])

  useEffect(() => {
    checkConnection()

    const handleApiOffline = () => {
      setIsOnline(false)
    }

    const handleNetworkOnline = () => {
      console.info('[server-monitor] Network online')
      setNetworkOnline(true)
      window.dispatchEvent(new CustomEvent('network-online'))
      checkConnection()
    }

    const handleNetworkOffline = () => {
      console.info('[server-monitor] Network offline')
      setNetworkOnline(false)
      window.dispatchEvent(new CustomEvent('network-offline'))
    }

    window.addEventListener('api-offline', handleApiOffline)
    window.addEventListener('online', handleNetworkOnline)
    window.addEventListener('offline', handleNetworkOffline)

    return () => {
      window.removeEventListener('api-offline', handleApiOffline)
      window.removeEventListener('online', handleNetworkOnline)
      window.removeEventListener('offline', handleNetworkOffline)
    }
  }, [])

  return (
    <ServerStatusContext.Provider value={{ isOnline, isChecking, checkConnection, dbConnected, networkOnline }}>
      {children}
    </ServerStatusContext.Provider>
  )
}
