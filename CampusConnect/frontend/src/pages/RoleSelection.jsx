import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowRight, FaChalkboardUser, FaMoon, FaSun, FaUserGraduate, FaUserTie } from 'react-icons/fa6'

export default function RoleSelection({ theme = 'dark', onToggleTheme }) {
  const [selectedRole, setSelectedRole] = useState(null)
  const navigate = useNavigate()

  const roles = [
    {
      id: 'student',
      name: 'Student',
      description: 'Attendance, notes, assignments, events, and profile access.',
      icon: FaUserGraduate,
      color: 'from-blue-600 to-cyan-500'
    },
    {
      id: 'faculty',
      name: 'Teacher/Staff',
      description: 'Classes, attendance marking, assignments, grades, and notices.',
      icon: FaChalkboardUser,
      color: 'from-violet-600 to-fuchsia-500'
    },
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Add users, manage accounts, and reset passwords.',
      icon: FaUserTie,
      color: 'from-emerald-600 to-teal-500'
    }
  ]

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId)
    sessionStorage.setItem('selectedRole', roleId)
    navigate('/login')
  }

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(14,165,233,0.15),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.12),transparent_25%),linear-gradient(135deg,#f8fafc,#e2e8f0_45%,#f1f5f9)] dark:bg-[radial-gradient(circle_at_15%_15%,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.15),transparent_25%),linear-gradient(135deg,#020617,#111827_45%,#0f172a)]" />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
          </button>
        </div>
        <div className="mb-10 max-w-3xl animate-fade-in">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-slate-950 text-xl font-black text-white shadow-lg dark:bg-white dark:text-slate-950">
            CC
          </div>
          <p className="text-sm uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">CampusConnect</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            College Management System
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Select your role to continue into the right secure workspace.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {roles.map((role, index) => {
            const Icon = role.icon
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleRoleSelect(role.id)}
                className={`group animate-slide-in rounded-2xl bg-gradient-to-br ${role.color} p-px text-left shadow-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${selectedRole === role.id ? 'ring-2 ring-white' : ''}`}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="block h-full rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/90">
                  <span className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${role.color} text-white shadow-lg`}>
                    <Icon className="text-2xl" />
                  </span>
                  <span className="block text-2xl font-bold text-slate-950 dark:text-white">{role.name}</span>
                  <span className="mt-3 block min-h-[72px] text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {role.description}
                  </span>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition group-hover:gap-3 dark:text-slate-200">
                    Continue <FaArrowRight />
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-8 rounded-xl border border-blue-400/20 bg-blue-500/10 px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
          First-time users are redirected to change their password before any dashboard opens.
        </div>
      </main>
    </div>
  )
}
