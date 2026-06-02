import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Html5Qrcode } from 'html5-qrcode'
import { CheckCircle, QrCode, ShieldCheck, AlertTriangle, Camera, RefreshCcw } from 'lucide-react'
import { useAttendance } from '../../context/AttendanceContext'

export default function StudentQRScanner() {
  const { scanAttendance, notifications, socketConnected, socketReconnecting, stats } = useAttendance()
  const [scanStatus, setScanStatus] = useState(null)
  const [scanMessage, setScanMessage] = useState('Point your camera at the QR code to check in.')
  const [scannerError, setScannerError] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const scannerRef = useRef(null)
  const html5QrcodeRef = useRef(null)

  const scannerId = 'student-qr-reader'

  const formattedNotifications = useMemo(() => notifications.slice(-2), [notifications])

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop()
      } catch {
        // ignore stop errors
      }
      html5QrcodeRef.current.clear().catch(() => {})
      html5QrcodeRef.current = null
    }
    setCameraReady(false)
  }

  const startScanner = async () => {
    setScannerError(null)
    setScanStatus(null)
    setScanMessage('Waiting for QR code…')

    const html5Qrcode = new Html5Qrcode(scannerId)
    html5QrcodeRef.current = html5Qrcode

    const config = {
      fps: 10,
      qrbox: { width: 300, height: 300 },
      rememberLastUsedCamera: true
    }

    const onScanSuccess = async (decodedText) => {
      if (!decodedText) return
      try {
        const payload = JSON.parse(decodedText)
        const { qrSessionId, token } = payload
        if (!qrSessionId || !token) {
          throw new Error('QR code format is invalid')
        }

        await scanAttendance({ qrSessionId, token })
        setScanStatus('success')
        setScanMessage('Attendance marked successfully. You are present!')
        await stopScanner()
      } catch (error) {
        setScanStatus('error')
        setScanMessage(error.message || 'Unable to scan QR code. Try again.')
      }
    }

    const onScanError = (errorMessage) => {
      if (!cameraReady) {
        setScanMessage('Looking for a valid QR code…')
      }
      console.debug('[qr-scanner] scan error', errorMessage)
    }

    try {
      const devices = await Html5Qrcode.getCameras()
      if (!devices || devices.length === 0) {
        throw new Error('No camera devices found')
      }

      await html5Qrcode.start(
        { facingMode: 'environment' },
        config,
        onScanSuccess,
        onScanError
      )
      setCameraReady(true)
      setScanStatus(null)
      setScanMessage('Scanner ready. Hold the phone steady over the QR code.')
    } catch (error) {
      console.error('[qr-scanner] init failed', error)
      setScannerError(error.message || 'Cannot start camera scanner')
      setScanMessage('Camera access is required to scan QR codes. Please allow camera permission.')
      stopScanner()
    }
  }

  useEffect(() => {
    startScanner()
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-fuchsia-500/10 backdrop-blur"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-fuchsia-300/80">Student Check-in</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">QR Scanner</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">Activate your device camera and scan the live QR code from the teacher’s screen. The system validates attendance instantly.</p>
          </div>
          <div className="rounded-3xl border border-slate-700/90 bg-slate-950/80 px-4 py-3 text-right text-slate-200">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Status</p>
            <p className="mt-1 text-sm font-semibold">{socketConnected ? 'Connected' : socketReconnecting ? 'Reconnecting' : 'Offline'}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-4">
            <div id={scannerId} className="min-h-[360px] rounded-3xl bg-slate-900" ref={scannerRef} />
            <div className="mt-5 rounded-3xl border border-slate-700/80 bg-slate-900/80 p-4 text-slate-200">
              <div className="flex items-center gap-2">
                {scanStatus === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : scanStatus === 'error' ? (
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                ) : (
                  <Camera className="h-5 w-5 text-sky-400" />
                )}
                <p className="text-sm font-semibold">{scanStatus === 'success' ? 'Scan completed' : scanStatus === 'error' ? 'Scan failed' : 'Ready to scan'}</p>
              </div>
              <p className="mt-2 text-sm text-slate-400">{scanMessage}</p>
            </div>
            {scannerError ? (
              <div className="mt-4 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                <p className="font-semibold">Camera permission denied</p>
                <p className="mt-1">Please allow camera access and refresh this page to continue.</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5">
              <div className="flex items-center gap-3 text-slate-100">
                <ShieldCheck className="h-6 w-6 text-cyan-300" />
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">QR Security</p>
                  <p className="mt-1 text-lg font-semibold text-white">One-time token validation</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-400">The QR code refreshes automatically every 15 seconds and invalidated tokens cannot be reused.</p>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Live stats</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-3xl bg-slate-900/90 p-4">
                  <p className="text-sm text-slate-500">Scanned so far</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stats.presentCount}</p>
                </div>
                <div className="rounded-3xl bg-slate-900/90 p-4">
                  <p className="text-sm text-slate-500">Scan attempts</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stats.scanAttempts}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={startScanner}
              className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <RefreshCcw className="h-4 w-4" /> Restart scanner
            </button>
          </div>
        </div>

        <AnimatePresence>
          {formattedNotifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-6 space-y-3"
            >
              {formattedNotifications.map((toast) => (
                <div key={toast.id} className="rounded-3xl border border-slate-700/80 bg-slate-950/90 p-4 text-sm text-slate-200">
                  <p className="font-semibold">{toast.type === 'danger' ? 'Alert' : 'Update'}</p>
                  <p className="mt-1 text-slate-400">{toast.message}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  )
}
