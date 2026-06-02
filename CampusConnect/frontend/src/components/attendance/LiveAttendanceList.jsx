import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, Clock3, UserCircle2 } from 'lucide-react'
import { useAttendance } from '../../context/AttendanceContext'

export default function LiveAttendanceList() {
  const { attendanceList } = useAttendance()

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-slate-900/20"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Live roll call</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Present students</h3>
        </div>
        <BadgeCheck className="h-6 w-6 text-emerald-400" />
      </div>

      <div className="mt-6 space-y-4">
        <AnimatePresence>
          {attendanceList.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-3xl border border-dashed border-slate-700/80 bg-slate-900/70 p-8 text-center text-slate-400"
            >
              <UserCircle2 className="mx-auto mb-4 h-12 w-12 text-slate-500" />
              <p className="text-sm">No students have scanned in yet. The list will update instantly when students check in.</p>
            </motion.div>
          ) : (
            attendanceList.map((entry, index) => (
              <motion.div
                key={entry.id || `${entry.collegeId}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl border border-slate-700/80 bg-slate-900/70 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500 to-sky-500 text-white shadow-lg shadow-cyan-500/20">
                      <span className="text-xl font-semibold">{entry.studentName?.charAt(0) || '?'}</span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{entry.studentName}</p>
                      <p className="text-sm text-slate-400">{entry.collegeId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Checked in</p>
                    <p className="mt-1 text-sm font-semibold text-white">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
