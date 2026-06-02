import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { useServerStatus } from './ServerStatusContext'
import apiClient from '../services/apiClient'
import { createSocket } from '../services/socketClient'

const AttendanceContext = createContext(null)

const buildStats = ({ attendanceList = [], expectedTotal = 0, sessionDurationMinutes = 0 }) => {
  const presentCount = attendanceList.length
  const absentCount = expectedTotal ? Math.max(0, expectedTotal - presentCount) : 0
  const percentage = expectedTotal > 0 ? Math.round((presentCount / expectedTotal) * 100) : presentCount > 0 ? 100 : 0

  return {
    presentCount,
    absentCount,
    scanAttempts: attendanceList.reduce((sum, entry) => sum + (entry.scanAttempts || 0), 0),
    expectedTotal,
    percentage,
    sessionDurationMinutes
  }
}

const defaultStats = {
  presentCount: 0,
  absentCount: 0,
  scanAttempts: 0,
  expectedTotal: 0,
  percentage: 0,
  sessionDurationMinutes: 0
}

const STORAGE_KEYS = {
  session: 'attendanceSession',
  qr: 'attendanceQr',
  list: 'attendanceList',
  stats: 'attendanceStats'
}

export const AttendanceProvider = ({ children }) => {
  const { user } = useAuth()
  const { isOnline } = useServerStatus()
  const [activeSession, setActiveSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.session))
    } catch {
      return null
    }
  })
  const [qrState, setQrState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.qr))
    } catch {
      return null
    }
  })
  const [attendanceList, setAttendanceList] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.list)) || []
    } catch {
      return []
    }
  })
  const [stats, setStats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.stats)) || defaultStats
    } catch {
      return defaultStats
    }
  })
  const [socketConnected, setSocketConnected] = useState(false)
  const [socketReconnecting, setSocketReconnecting] = useState(false)
  const [socketError, setSocketError] = useState(null)
  const [notifications, setNotifications] = useState([])

  const socketRef = useRef(null)
  const notificationTimers = useRef({})

  const persistState = useCallback((session, qr, list, outputStats) => {
    if (session) localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEYS.session)

    if (qr) localStorage.setItem(STORAGE_KEYS.qr, JSON.stringify(qr))
    else localStorage.removeItem(STORAGE_KEYS.qr)

    if (list) localStorage.setItem(STORAGE_KEYS.list, JSON.stringify(list))
    else localStorage.removeItem(STORAGE_KEYS.list)

    if (outputStats) localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(outputStats))
    else localStorage.removeItem(STORAGE_KEYS.stats)
  }, [])

  const addNotification = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setNotifications((prev) => [...prev, { id, message, type }])

    if (notificationTimers.current[id]) {
      clearTimeout(notificationTimers.current[id])
    }

    notificationTimers.current[id] = window.setTimeout(() => {
      setNotifications((prev) => prev.filter((toast) => toast.id !== id))
      delete notificationTimers.current[id]
    }, 4500)
  }, [])

  const clearNotifications = useCallback(() => {
    Object.values(notificationTimers.current).forEach(clearTimeout)
    notificationTimers.current = {}
    setNotifications([])
  }, [])

  const updateSessionStats = useCallback(
    (list = attendanceList, expectedTotal = stats.expectedTotal, durationMinutes = stats.sessionDurationMinutes) => {
      const next = buildStats({ attendanceList: list, expectedTotal, sessionDurationMinutes: durationMinutes })
      setStats(next)
      persistState(activeSession, qrState, list, next)
    },
    [activeSession, attendanceList, qrState, stats.expectedTotal, stats.sessionDurationMinutes, persistState]
  )

  const joinRooms = useCallback(
    (socket, session) => {
      if (!session || !session._id) return
      socket.emit('joinRoom', `qr_${session._id}`)
      if (session.lectureId) socket.emit('joinRoom', `lecture_${session.lectureId}`)
    },
    []
  )

  const leaveRooms = useCallback(
    (socket, session) => {
      if (!socket || !session || !session._id) return
      socket.emit('leaveRoom', `qr_${session._id}`)
      if (session.lectureId) socket.emit('leaveRoom', `lecture_${session.lectureId}`)
    },
    []
  )

  const resetAttendanceState = useCallback(
    (preserveSocket = false) => {
      if (socketRef.current && !preserveSocket) {
        leaveRooms(socketRef.current, activeSession)
        socketRef.current.disconnect()
      }
      setActiveSession(null)
      setQrState(null)
      setAttendanceList([])
      setStats(defaultStats)
      persistState(null, null, null, null)
    },
    [activeSession, leaveRooms, persistState]
  )

  const fetchSessionAttendance = useCallback(
    async (sessionId) => {
      if (!sessionId) return
      try {
        const response = await apiClient.getSessionAttendance(sessionId)
        if (response.success) {
          const records = (response.records || []).map((record) => ({
            id: record._id,
            studentName: record.student?.name || 'Unknown student',
            collegeId: record.student?.collegeId || 'N/A',
            timestamp: record.timestamp,
            status: 'present',
            scanAttempts: 1
          }))
          setAttendanceList(records)
          const expectedTotal = activeSession?.expectedTotal || stats.expectedTotal || 0
          const durationMinutes = activeSession?.durationMinutes || stats.sessionDurationMinutes || 0
          const next = buildStats({ attendanceList: records, expectedTotal, sessionDurationMinutes: durationMinutes })
          setStats(next)
          persistState(activeSession, qrState, records, next)
        }
      } catch (error) {
        console.warn('[attendance] fetchSessionAttendance failed', error)
      }
    },
    [activeSession, qrState, persistState, stats.expectedTotal, stats.sessionDurationMinutes]
  )

  const fetchSessionMeta = useCallback(
    async (sessionId) => {
      if (!sessionId) return
      try {
        const response = await apiClient.getSessionMeta(sessionId)
        if (response.success) {
          const session = {
            ...activeSession,
            ...response.session,
            active: response.session.active !== false,
            startedAt: activeSession?.startedAt || Date.now(),
            subjectName: response.session.subject?.name || activeSession?.subjectName || '',
            expectedTotal: activeSession?.expectedTotal || stats.expectedTotal || 0,
            durationMinutes: activeSession?.durationMinutes || stats.sessionDurationMinutes || 0
          }
          setActiveSession(session)
          persistState(session, qrState, attendanceList, stats)
          return session
        }
      } catch (error) {
        console.warn('[attendance] fetchSessionMeta failed', error)
      }
      return null
    },
    [activeSession, attendanceList, qrState, persistState, stats, stats.expectedTotal, stats.sessionDurationMinutes]
  )

  const loadStoredSession = useCallback(async () => {
    if (!activeSession?._id || !isOnline) return
    const session = await fetchSessionMeta(activeSession._id)
    if (session) {
      if (socketRef.current && socketRef.current.connected) {
        leaveRooms(socketRef.current, activeSession)
        joinRooms(socketRef.current, session)
      }
      fetchSessionAttendance(session._id)
    }
  }, [activeSession, fetchSessionAttendance, fetchSessionMeta, isOnline, joinRooms, leaveRooms])

  const reconnectSocket = useCallback(() => {
    if (!socketRef.current || socketRef.current.connected) return
    socketRef.current.connect()
  }, [])

  const startAttendance = useCallback(
    async ({ lectureId, subjectId, subjectName, durationMinutes = 15, expectedTotal = 0 }) => {
      try {
        const response = await apiClient.startAttendance({ lectureId, subjectId, durationMinutes })
        if (!response.success) {
          throw new Error(response.message || 'Unable to start attendance')
        }

        const session = {
          _id: response.qrSessionId,
          lectureId,
          subjectId,
          subjectName,
          active: true,
          startedAt: Date.now(),
          durationMinutes,
          expectedTotal
        }

        const qr = {
          token: response.token,
          expiresAt: response.expiresAt,
          rotationCount: 1
        }

        setActiveSession(session)
        setQrState(qr)
        setAttendanceList([])
        const nextStats = buildStats({ attendanceList: [], expectedTotal, sessionDurationMinutes: durationMinutes })
        setStats(nextStats)
        persistState(session, qr, [], nextStats)
        addNotification('Attendance session started', 'success')

        if (socketRef.current && socketRef.current.connected) {
          joinRooms(socketRef.current, session)
        }

        return response
      } catch (error) {
        addNotification(error.message || 'Failed to create attendance session', 'danger')
        throw error
      }
    },
    [addNotification, joinRooms, persistState]
  )

  const endAttendance = useCallback(
    async () => {
      if (!activeSession?._id) {
        addNotification('No active attendance session found', 'warning')
        return
      }
      try {
        const response = await apiClient.endAttendance(activeSession._id)
        if (response.success) {
          setActiveSession((current) => (current ? { ...current, active: false } : current))
          addNotification('Attendance session ended', 'info')
          if (socketRef.current && socketRef.current.connected) {
            leaveRooms(socketRef.current, activeSession)
          }
        }
        return response
      } catch (error) {
        addNotification(error.message || 'Failed to end attendance', 'danger')
        throw error
      }
    },
    [activeSession, addNotification, leaveRooms]
  )

  const scanAttendance = useCallback(
    async ({ qrSessionId, token }) => {
      try {
        const response = await apiClient.scanAttendance({ qrSessionId, token })
        if (response.success) {
          addNotification('Attendance scanned successfully', 'success')
          setStats((prev) => {
            const next = { ...prev, scanAttempts: prev.scanAttempts + 1 }
            persistState(activeSession, qrState, attendanceList, next)
            return next
          })
        }
        return response
      } catch (error) {
        addNotification(error.message || 'Scan failed', 'danger')
        setStats((prev) => {
          const next = { ...prev, scanAttempts: prev.scanAttempts + 1 }
          persistState(activeSession, qrState, attendanceList, next)
          return next
        })
        throw error
      }
    },
    [activeSession, addNotification, attendanceList, persistState, qrState]
  )

  const refreshAttendanceData = useCallback(async () => {
    if (!activeSession?._id) return
    await fetchSessionAttendance(activeSession._id)
  }, [activeSession, fetchSessionAttendance])

  useEffect(() => {
    persistState(activeSession, qrState, attendanceList, stats)
  }, [activeSession, qrState, attendanceList, stats, persistState])

  useEffect(() => {
    if (!user?.userId || !isOnline) {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      return
    }

    if (socketRef.current && socketRef.current.connected) {
      return
    }

    const socket = createSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
      setSocketError(null)
      setSocketReconnecting(false)
      addNotification('Realtime attendance connected', 'success')
      if (activeSession) {
        joinRooms(socket, activeSession)
      }
    })

    socket.on('disconnect', (reason) => {
      setSocketConnected(false)
      if (reason !== 'io client disconnect') {
        setSocketReconnecting(true)
        addNotification('Realtime connection lost, reconnecting...', 'warning')
      }
    })

    socket.on('reconnect_attempt', () => {
      setSocketReconnecting(true)
      setSocketError(null)
    })

    socket.on('reconnect', () => {
      setSocketConnected(true)
      setSocketReconnecting(false)
      addNotification('Realtime connection restored', 'success')
      if (activeSession) {
        joinRooms(socket, activeSession)
        fetchSessionAttendance(activeSession._id)
      }
    })

    socket.on('attendance:started', (payload) => {
      if (!payload) return
      setActiveSession((current) => ({
        ...current,
        _id: payload.qrSessionId,
        lectureId: payload.lectureId,
        active: true,
        startedAt: current?.startedAt || Date.now()
      }))
      setQrState({ token: payload.token, expiresAt: payload.expiresAt, rotationCount: payload.rotationCount || 1 })
      addNotification('Attendance session is live', 'success')
    })

    socket.on('qr:rotated', (payload) => {
      if (!payload) return
      setQrState({ token: payload.token, expiresAt: payload.expiresAt, rotationCount: payload.rotationCount })
    })

    socket.on('attendance:marked', (payload) => {
      const attendance = payload?.attendance
      if (!attendance) return
      setAttendanceList((prev) => {
        const next = [
          {
            id: attendance._id || `${attendance.student?._id || attendance.student}-${Date.now()}`,
            studentName: attendance.student?.name || attendance.student || 'Student',
            collegeId: attendance.student?.collegeId || 'N/A',
            timestamp: attendance.timestamp || new Date().toISOString(),
            status: 'present',
            scanAttempts: 1
          },
          ...prev
        ]
        const expectedTotal = activeSession?.expectedTotal || stats.expectedTotal || 0
        const durationMinutes = activeSession?.durationMinutes || stats.sessionDurationMinutes || 0
        const nextStats = buildStats({ attendanceList: next, expectedTotal, sessionDurationMinutes: durationMinutes })
        setStats(nextStats)
        persistState(activeSession, qrState, next, nextStats)
        return next
      })
    })

    socket.on('attendance:update', (payload) => {
      if (!payload) return
      setStats((prev) => {
        const next = { ...prev, scanAttempts: prev.scanAttempts + 1 }
        persistState(activeSession, qrState, attendanceList, next)
        return next
      })
    })

    socket.on('attendance:closed', () => {
      setActiveSession((current) => (current ? { ...current, active: false } : current))
      addNotification('Attendance session has been closed', 'info')
    })

    socket.on('attendance:error', (payload) => {
      addNotification(payload?.message || 'Attendance error', 'danger')
    })

    socket.on('attendance:stats:update', async (payload) => {
      const id = payload?.qrSessionId || activeSession?._id
      if (id) fetchSessionAttendance(id)
    })

    socket.connect()

    return () => {
      if (socketRef.current) {
        socketRef.current.off()
        socketRef.current.disconnect()
      }
    }
  }, [activeSession, addNotification, fetchSessionAttendance, isOnline, joinRooms, stats.expectedTotal, stats.sessionDurationMinutes, user?.userId])

  useEffect(() => {
    if (activeSession?._id && isOnline) {
      loadStoredSession()
    }
  }, [activeSession?._id, isOnline, loadStoredSession])

  const value = useMemo(
    () => ({
      activeSession,
      qrState,
      attendanceList,
      stats,
      socketConnected,
      socketReconnecting,
      socketError,
      notifications,
      startAttendance,
      endAttendance,
      scanAttendance,
      refreshAttendanceData,
      addNotification,
      clearNotifications
    }),
    [activeSession, addNotification, attendanceList, clearNotifications, endAttendance, qrState, refreshAttendanceData, scanAttendance, socketConnected, socketError, socketReconnecting, startAttendance, stats, notifications]
  )

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>
}

export const useAttendance = () => useContext(AttendanceContext)
