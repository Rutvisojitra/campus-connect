import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, RefreshCcw } from 'lucide-react'
import { useAttendance } from '../../context/AttendanceContext'

const formatTimer = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export default function AttendanceSessionTimer() {
  const { qrState, activeSession } = useAttendance()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  const nextRotation = useMemo(() => {
    if (!qrState?.expiresAt) return null
    return Math.max(0, Math.floor((new Date(qrState.expiresAt).getTime() - now) / 1000))
  }, [now, qrState])

  const sessionElapsed = useMemo(() => {
    if (!activeSession?.startedAt) return null
    return Math.max(0, Math.floor((now - new Date(activeSession.startedAt).getTime()) / 1000))
  }, [activeSession?.startedAt, now])

  const sessionRemaining = useMemo(() => {
    if (!activeSession?.startedAt || !activeSession?.durationMinutes) return null
    const sessionEnd = new Date(activeSession.startedAt).getTime() + activeSession.durationMinutes * 60000
    return Math.max(0, Math.floor((sessionEnd - now) / 1000))
  }, [activeSession?.durationMinutes, activeSession?.startedAt, now])

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-lg shadow-slate-900/20"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Session timer</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Live countdown</h3>
        </div>
        <RefreshCcw className="h-6 w-6 text-cyan-300" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Next QR refresh</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-3xl font-semibold text-white">{nextRotation !== null ? formatTimer(nextRotation) : '--:--'}</p>
              <p className="text-sm text-slate-400">Auto refresh interval</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Session duration</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-500/10 text-violet-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-3xl font-semibold text-white">{sessionRemaining !== null ? formatTimer(sessionRemaining) : durationText(activeSession)}</p>
              <p className="text-sm text-slate-400">Time since start</p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

const durationText = (activeSession) => {
  if (!activeSession?.durationMinutes) return 'Ongoing'
  return `${activeSession.durationMinutes} min`
}
