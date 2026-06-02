import React from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Clock3, Layers, ShieldCheck } from 'lucide-react'
import { useAttendance } from '../../context/AttendanceContext'

export default function AttendanceStats() {
  const { stats, activeSession } = useAttendance()
  const percentageText = stats.expectedTotal ? `${stats.percentage}%` : '—'
  const durationText = activeSession?.durationMinutes ? `${activeSession.durationMinutes} min` : 'Auto'

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-500/10"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Attendance analytics</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Live session stats</h3>
        </div>
        <div className="rounded-3xl bg-slate-950/90 px-4 py-3 text-slate-200">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Completion</p>
          <p className="mt-1 text-lg font-semibold text-white">{percentageText}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          {
            label: 'Present',
            value: stats.presentCount,
            icon: BarChart3,
            accent: 'from-cyan-500 to-sky-500'
          },
          {
            label: 'Absent',
            value: stats.expectedTotal ? stats.absentCount : '—',
            icon: Layers,
            accent: 'from-violet-500 to-fuchsia-500'
          },
          {
            label: 'Scans',
            value: stats.scanAttempts,
            icon: ShieldCheck,
            accent: 'from-emerald-500 to-lime-500'
          },
          {
            label: 'Duration',
            value: durationText,
            icon: Clock3,
            accent: 'from-orange-500 to-amber-500'
          }
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${card.accent} text-white`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  )
}
