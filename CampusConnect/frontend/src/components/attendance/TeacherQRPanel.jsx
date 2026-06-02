import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import { Clock, QrCode, Sparkles, Users, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useAttendance } from '../../context/AttendanceContext'

const formFields = {
  lectureId: '',
  subjectId: '',
  subjectName: '',
  durationMinutes: 15,
  expectedTotal: 30
}

export default function TeacherQRPanel() {
  const { activeSession, qrState, stats, startAttendance, endAttendance, notifications, socketConnected, socketReconnecting } = useAttendance()
  const [formState, setFormState] = useState(formFields)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const qrPayload = useMemo(() => {
    if (!activeSession?._id || !qrState?.token) return ''
    try {
      return JSON.stringify({ qrSessionId: activeSession._id, token: qrState.token })
    } catch {
      return ''
    }
  }, [activeSession, qrState])

  const countdownSeconds = useMemo(() => {
    if (!qrState?.expiresAt) return null
    return Math.max(0, Math.floor((new Date(qrState.expiresAt).getTime() - Date.now()) / 1000))
  }, [qrState])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: name === 'expectedTotal' || name === 'durationMinutes' ? Number(value) : value }))
  }

  const handleStart = async (event) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await startAttendance({
        lectureId: formState.lectureId.trim(),
        subjectId: formState.subjectId.trim(),
        subjectName: formState.subjectName.trim() || formState.subjectId.trim(),
        durationMinutes: formState.durationMinutes,
        expectedTotal: formState.expectedTotal
      })
    } catch (err) {
      setError(err.message || 'Unable to start attendance')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Live Attendance</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Teacher QR Panel</h2>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">Start a live QR attendance session, share the rotating QR code with your classroom, and watch check-ins appear instantly.</p>
            </div>
            <div className="rounded-3xl bg-slate-800/90 px-4 py-3 border border-slate-700 text-slate-200 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Realtime</p>
              <p className="mt-1 text-sm font-semibold">{socketConnected ? 'Connected' : socketReconnecting ? 'Reconnecting' : 'Offline'}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Present</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">{stats.presentCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Scans</p>
              <p className="mt-2 text-3xl font-semibold text-sky-300">{stats.scanAttempts}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeSession?.active && qrPayload ? (
              <motion.div
                key="active-qr"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mt-8 rounded-3xl border border-cyan-500/20 bg-slate-900/90 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Session live</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">QR Code rotating every 15 seconds</h3>
                    <p className="mt-2 text-sm text-slate-400">Lecture: {activeSession.lectureId || 'N/A'}</p>
                    <p className="mt-1 text-sm text-slate-400">Subject: {activeSession.subjectName || 'Unknown'}</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-3xl bg-slate-800/95 px-4 py-3 text-slate-100 shadow-lg shadow-cyan-500/10">
                    <Clock className="h-5 w-5 text-cyan-300" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Next refresh</p>
                      <p className="text-lg font-semibold">{countdownSeconds ?? '--'}s</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr] items-start">
                  <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5 flex items-center justify-center">
                    <div className="relative w-full max-w-xs">
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-transparent to-slate-900/0" />
                      <div className="relative rounded-3xl bg-slate-950 p-5">
                        <QRCode value={qrPayload} size={240} bgColor="transparent" fgColor="#7dd3fc" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-6 space-y-4">
                    <div className="rounded-3xl bg-slate-900/80 p-4 border border-slate-700/60">
                      <p className="text-sm text-slate-400">Session token</p>
                      <p className="mt-2 text-sm text-slate-200 break-words">{qrState?.token ?? 'Waiting for QR generation...'}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl bg-slate-900/90 p-4 border border-slate-700/70">
                        <p className="text-sm text-slate-400">Rotation</p>
                        <p className="mt-2 text-xl font-semibold text-white">{qrState?.rotationCount || 1}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-900/90 p-4 border border-slate-700/70">
                        <p className="text-sm text-slate-400">Duration</p>
                        <p className="mt-2 text-xl font-semibold text-white">{activeSession.durationMinutes} min</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={endAttendance}
                      className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-white transition hover:bg-red-700"
                    >
                      <XCircle className="h-5 w-5" /> End Attendance
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="start-form"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                onSubmit={handleStart}
                className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-6"
              >
                <div className="flex items-center gap-3 text-slate-200">
                  <QrCode className="h-6 w-6 text-cyan-300" />
                  <p className="font-semibold text-white">Start a new live session</p>
                </div>
                <div className="mt-6 grid gap-4">
                  <label className="space-y-2 text-sm text-slate-300">
                    Lecture code
                    <input
                      required
                      name="lectureId"
                      value={formState.lectureId}
                      onChange={handleChange}
                      placeholder="e.g. CSE301-A"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    Subject ID
                    <input
                      required
                      name="subjectId"
                      value={formState.subjectId}
                      onChange={handleChange}
                      placeholder="Existing subject object id"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    Display subject name
                    <input
                      name="subjectName"
                      value={formState.subjectName}
                      onChange={handleChange}
                      placeholder="Optional human-friendly label"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-300">
                      Class size
                      <input
                        type="number"
                        name="expectedTotal"
                        value={formState.expectedTotal}
                        onChange={handleChange}
                        min={1}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      Session duration
                      <input
                        type="number"
                        name="durationMinutes"
                        value={formState.durationMinutes}
                        onChange={handleChange}
                        min={5}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                      />
                    </label>
                  </div>
                </div>
                {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Starting session...' : 'Start Attendance'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10"
        >
          <div className="flex items-center justify-between gap-3 text-slate-200">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Session summary</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Live attendance snapshot</h3>
            </div>
            <div className="rounded-3xl bg-slate-950/80 px-4 py-3 text-sm text-slate-300 border border-slate-700">
              <span>{activeSession?.active ? 'Active' : 'Dormant'}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-3xl bg-slate-950/80 p-4 border border-slate-700">
              <p className="text-sm text-slate-400">Course</p>
              <p className="mt-2 text-lg font-semibold text-white">{activeSession?.lectureId || 'No active session'}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-4 border border-slate-700">
              <p className="text-sm text-slate-400">Subject</p>
              <p className="mt-2 text-lg font-semibold text-white">{activeSession?.subjectName || 'Not configured'}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-4 border border-slate-700">
              <p className="text-sm text-slate-400">Class size</p>
              <p className="mt-2 text-lg font-semibold text-white">{stats.expectedTotal || 'Unknown'}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 text-slate-950">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Attendance percentage</p>
                <p className="mt-1 text-2xl font-semibold text-white">{stats.expectedTotal ? `${stats.percentage}%` : '—'}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">QR health</p>
                <p className="mt-1 text-2xl font-semibold text-white">{qrState ? 'Refreshing' : 'Waiting'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-slate-950/80 p-4 border border-slate-700">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Notifications</p>
            <div className="mt-4 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500">No recent attendance alerts.</p>
              ) : (
                notifications.slice(-3).map((toast) => (
                  <div key={toast.id} className="rounded-2xl border border-slate-700/90 bg-slate-900/90 p-3 text-slate-100">
                    <div className="flex items-center gap-2 text-sm">
                      {toast.type === 'danger' ? <AlertTriangle className="h-4 w-4 text-rose-400" /> : <CheckCircle className="h-4 w-4 text-emerald-400" />}
                      <span>{toast.message}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
