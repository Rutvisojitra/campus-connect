import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaEye, FaEyeSlash, FaIdCard, FaLock, FaMoon, FaSun } from 'react-icons/fa6'
import { useAuth } from '../context/AuthContext'

const roleContent = {
  student: {
    title: 'Student Login',
    accent: 'from-blue-600 to-cyan-500',
    email: '24cp036@student.college.edu',
    password: '24cp036'
  },
  faculty: {
    title: 'Teacher/Staff Login',
    accent: 'from-violet-600 to-fuchsia-500',
    email: 'ravi.patel@staff.college.com',
    password: 'Ravi@123'
  },
  admin: {
    title: 'Administrator Login',
    accent: 'from-emerald-600 to-teal-500',
    email: 'admin@college.com',
    password: 'Admin@123'
  }
}

export default function Login({ theme = 'dark', onToggleTheme }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const { login, user } = useAuth()

  const selectedCopy = useMemo(
    () => roleContent[selectedRole] || roleContent.student,
    [selectedRole]
  )

  useEffect(() => {
    if (user) {
      navigate(getDashboardPath(user.role), { replace: true })
      return
    }

    const role = sessionStorage.getItem('selectedRole')
    if (!role || !roleContent[role]) {
      navigate('/')
      return
    }

    const savedIdentifier = localStorage.getItem('rememberMe') === 'true'
      ? localStorage.getItem('identifier') || ''
      : ''

    setSelectedRole(role)
    setFormData(prev => ({
      ...prev,
      identifier: savedIdentifier,
      rememberMe: Boolean(savedIdentifier)
    }))
  }, [navigate, user])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError('')
  }

  const getDashboardPath = (role) => {
    if (role === 'student') return '/student-dashboard'
    if (role === 'faculty') return '/teacher-dashboard'
    if (role === 'admin') return '/admin-dashboard'
    return '/'
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.identifier.trim() || !formData.password.trim()) {
      setError('Please enter your email or college ID and password.')
      return
    }

    setLoading(true)
    try {
      const response = await login(
        formData.identifier.trim(),
        formData.password,
        formData.rememberMe,
        selectedRole
      )

      if (response.success) {
        navigate(response.user.firstLogin ? '/change-password' : getDashboardPath(response.user.role))
      }
    } catch (err) {
      if (err.code === 'ACCOUNT_NOT_FOUND') {
        sessionStorage.setItem('registerIdentifier', formData.identifier.trim())
        navigate('/register')
        return
      }
      setError(err.message || 'Invalid login. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.12),transparent_25%),linear-gradient(135deg,#f8fafc,#e2e8f0_45%,#f1f5f9)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.14),transparent_25%),linear-gradient(135deg,#020617,#111827_45%,#0f172a)]" />
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:flex flex-col justify-between px-12 py-10">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-black">
              CC
            </div>
            <p className="mt-4 text-sm uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">CampusConnect</p>
          </div>

          <div className="max-w-2xl pb-12">
            <p className="mb-5 inline-flex rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Secure role based college portal
            </p>
            <h1 className="text-5xl font-bold leading-tight">
              One login experience for students, staff, and administrators.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
              JWT authentication, MongoDB users, first-login password changes, and protected dashboards are wired into a clean full-stack system.
            </p>
          </div>
        </section>

        <main className="flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-md">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              <FaArrowLeft /> Change role
            </button>

            <div className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] sm:p-8">
              <div className="mb-5 flex justify-end">
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <FaSun /> : <FaMoon />}
                </button>
              </div>
              <div className={`mb-6 h-1.5 w-20 rounded-full bg-gradient-to-r ${selectedCopy.accent}`} />
              <h2 className="text-3xl font-bold">{selectedCopy.title}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Sign in with your registered college email or college ID.
              </p>

              {error && (
                <div className="mt-6 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email or College ID</label>
                  <div className="relative">
                    <FaIdCard className="absolute left-4 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      name="identifier"
                      value={formData.identifier}
                      onChange={handleChange}
                      placeholder={`${selectedCopy.email} or college ID`}
                      disabled={loading}
                      className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                  <div className="relative">
                    <FaLock className="absolute left-4 top-3.5 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={selectedCopy.password}
                      disabled={loading}
                      className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-12 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      className="absolute right-4 top-3.5 text-slate-500 transition hover:text-slate-200"
                      disabled={loading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    disabled={loading}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  Remember me
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full rounded-lg bg-gradient-to-r ${selectedCopy.accent} px-4 py-3 font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </span>
                  ) : (
                    'Login'
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-lg border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-slate-300">
                <p className="font-semibold text-blue-200">Sample login</p>
                <p className="mt-2 text-slate-700 dark:text-slate-300">{selectedCopy.email}</p>
                <p className="text-slate-700 dark:text-slate-300">{selectedCopy.password}</p>
              </div>

              <div className="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
                New to CampusConnect?{' '}
                <button type="button" onClick={() => navigate('/register')} className="font-semibold text-blue-600 dark:text-blue-300">
                  Register account
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
