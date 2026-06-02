import React from 'react'
import { useServerStatus } from '../context/ServerStatusContext'

export default function ReconnectingOverlay() {
  const { isOnline } = useServerStatus()

  if (isOnline) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md transition-all duration-500 animate-fadeIn pointer-events-none">
      <div className="relative flex flex-col items-center p-8 md:p-12 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-2xl shadow-emerald-500/5 max-w-md text-center pointer-events-auto">
        {/* Glowing aura effect */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-500 to-amber-500 opacity-20 blur-xl animate-pulse"></div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Animated Spinner with Custom Premium SVGs */}
          <div className="relative w-20 h-20 mb-6">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-red-500 border-r-amber-500 animate-spin"></div>
            {/* Inner pulsing core */}
            <div className="absolute inset-3 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800/50 shadow-inner">
              <svg 
                className="w-8 h-8 text-amber-500 animate-pulse" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 10V3L4 14h7v7l9-11h-7z" 
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
            Reconnecting to server...
          </h2>
          
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            The CampusConnect backend is currently offline. Your data is secure, and we are automatically retrying to establish a connection every 3 seconds.
          </p>

          {/* Micro-activity indicators */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800/40">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>Polling API status</span>
          </div>
        </div>
      </div>
    </div>
  )
}
