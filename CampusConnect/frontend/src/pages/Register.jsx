import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaMoon, FaSun, FaUserPlus } from 'react-icons/fa6'
import { useAuth } from '../context/AuthContext'

const roleLabels = {
  student: 'Student',
  faculty: 'Teacher/Staff',
  admin: 'Administrator'
}

const roleAccents = {
  student: 'from-blue-600 to-cyan-500',
  faculty: 'from-violet-600 to-fuchsia-500',
  admin: 'from-emerald-600 to-teal-500'
}

const getInitialRole = () => {
  const role = sessionStorage.getItem('selectedRole')
  return ['student', 'faculty', 'admin'].includes(role) ? role : 'student'
}

export default function Register({ theme = 'dark', onToggleTheme }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    collegeId: '',
    role: getInitialRole(),
    department: 'CSE',
    semester: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const accent = useMemo(() => roleAccents[formData.role], [formData.role])

  useEffect(() => {
    const identifier = sessionStorage.getItem('registerIdentifier') || ''
    if (!identifier) return

    setFormData(prev => ({
      ...prev,
      email: identifier.includes('@') ? identifier : prev.email,
      collegeId: identifier.includes('@') ? prev.collegeId : identifier.toLowerCase()
    }))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'collegeId' ? value.toLowerCase() : value
    }))
    setError('')
    setSuccess('')
  }

  const validateClientSide = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.role) {
      return 'Please provide name, email, password, and role.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return 'Please provide a valid email address.'
    }

    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters.'
    }

    return ''
  }

  const { register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validationError = validateClientSide()
    if (validationError) {
      setError(validationError)
      return
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
      collegeId: formData.collegeId.trim().toLowerCase() || undefined,
      department: formData.department,
      semester: formData.role === 'student' && formData.semester ? Number(formData.semester) : undefined
    }

    console.log('[register] Sending signup payload:', {
      ...payload,
      password: '[hidden]'
    })

    setLoading(true)
    try {
      const response = await register(payload)
      if (response.success) {
        sessionStorage.setItem('selectedRole', formData.role)
        sessionStorage.removeItem('registerIdentifier')
        setSuccess(response.message || 'Account created successfully')
        if (response.user && response.user.role) {
          setTimeout(() => navigate(response.user.firstLogin ? '/change-password' : `/`), 1200)
        } else {
          setTimeout(() => navigate('/login'), 1200)
        }
      }
    } catch (err) {
      console.error('[register] Signup error shown to user:', err)
      setError(err.message || 'Unable to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,#f8fafc,#e2e8f0_45%,#f1f5f9)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(16,185,129,0.14),transparent_28%),linear-gradient(135deg,#020617,#111827_45%,#0f172a)]" />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full">
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              <FaArrowLeft /> Back to login
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <FaSun /> : <FaMoon />}
            </button>
          </div>

          <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] lg:grid-cols-[0.9fr_1.1fr]">
            <div className={`bg-gradient-to-br ${accent} p-8 text-white sm:p-10`}>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-xl">
                <FaUserPlus />
              </div>
              <h1 className="mt-8 text-4xl font-bold leading-tight">Create your CampusConnect account</h1>
              <p className="mt-4 text-white/85">
                Your account is stored in MongoDB and can be used from any device after signup.
              </p>
              <div className="mt-8 rounded-xl bg-white/15 p-4 text-sm">
                College ID is optional during signup. Email, password, and role are required.
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 p-6 sm:p-8">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Registration</p>
                <h2 className="mt-2 text-2xl font-bold">{roleLabels[formData.role]}</h2>
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-200">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-200">
                  {success}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <input className="input-field" name="name" value={formData.name} onChange={handleChange} placeholder="Full name" required />
                <select className="input-field" name="role" value={formData.role} onChange={handleChange}>
                  <option value="student">Student</option>
                  <option value="faculty">Teacher/Staff</option>
                  <option value="admin">Administrator</option>
                </select>
                <input className="input-field" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="rutvi@gmail.com" required />
                <input className="input-field" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password (min 6 characters)" required />
                <input className="input-field" name="collegeId" value={formData.collegeId} onChange={handleChange} placeholder="College ID (optional)" />
                <select className="input-field" name="department" value={formData.department} onChange={handleChange}>
                  {['CSE', 'ECE', 'ME', 'CIVIL', 'EEE', 'BT', 'Other'].map(dep => <option key={dep} value={dep}>{dep}</option>)}
                </select>
                <input className="input-field md:col-span-2" type="number" min="1" max="8" name="semester" value={formData.semester} onChange={handleChange} placeholder="Semester (students only)" disabled={formData.role !== 'student'} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`mt-2 rounded-lg bg-gradient-to-r ${accent} px-4 py-3 font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60`}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}
