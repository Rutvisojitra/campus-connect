import React from 'react'
import { useServerStatus } from '../context/ServerStatusContext'

export default function DatabaseWarningBanner() {
  const { isOnline, dbConnected } = useServerStatus()

  if (!isOnline || dbConnected) return null

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9998] max-w-xl w-full px-4">
      <div className="bg-amber-500/95 text-slate-900 px-4 py-3 rounded-md shadow-md text-sm text-center font-medium">
        Server online — database reconnecting. Some features may be delayed.
      </div>
    </div>
  )
}
