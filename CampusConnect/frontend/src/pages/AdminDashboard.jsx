import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaKey, FaPen, FaRightFromBracket, FaTrash, FaUserPlus, FaUsers } from 'react-icons/fa6'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
  name: '',
  email: '',
  collegeId: '',
  role: 'student',
  department: 'CSE',
  semester: '',
  password: ''
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login', { replace: true })
      return
    }
    fetchUsers()
  }, [user, navigate])

  const handleLogout = async () => {
    try {
      await logout()
      // Clear any session data
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('[dashboard] Logout failed:', error)
      // Force logout even if API call fails
      navigate('/login', { replace: true })
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
    setMessage('')
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        ...formData,
        semester: formData.role === 'student' && formData.semester
          ? Number(formData.semester)
          : undefined,
        password: formData.password || formData.collegeId
      }

      const response = await authService.addUser(payload)
      if (response.success) {
        setMessage(`${response.user.name} added successfully.`)
        setFormData(emptyForm)
        setShowForm(false)
        await fetchUsers()
      }
    } catch (err) {
      setError(err.message || 'Unable to add user.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (targetUser) => {
    const defaultPassword = targetUser.role === 'student'
      ? targetUser.collegeId
      : `${targetUser.name.split(' ')[0]}@123`

    setSaving(true)
    setError('')
    setMessage('')
    try {
      await authService.resetPassword(targetUser._id, defaultPassword)
      setMessage(`Password reset for ${targetUser.name}. New password: ${defaultPassword}`)
      await fetchUsers()
    } catch (err) {
      setError(err.message || 'Unable to reset password.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (targetUser) => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await authService.deleteUser(targetUser._id)
      setMessage(`${targetUser.name} deleted successfully.`)
      await fetchUsers()
    } catch (err) {
      setError(err.message || 'Unable to delete user.')
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = (role) => {
    if (role === 'faculty') return 'Teacher/Staff'
    if (role === 'admin') return 'Administrator'
    return 'Student'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400" />
          <p className="text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">CampusConnect</p>
            <h1 className="mt-1 text-2xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="text-right">
              <p className="font-semibold">{user?.name}</p>
              <p className="text-sm text-slate-400">Administrator</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
            >
              <FaRightFromBracket /> Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-600 to-teal-500 p-6 shadow-xl sm:p-8">
          <h2 className="text-3xl font-bold">Welcome, {user?.name}</h2>
          <p className="mt-2 text-emerald-50">Manage students, teacher/staff accounts, access status, and password resets.</p>
        </section>

        {(message || error) && (
          <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-400/40 bg-red-500/10 text-red-200' : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'}`}>
            {error || message}
          </div>
        )}

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Users', value: users.length, color: 'from-blue-600 to-cyan-500' },
            { label: 'Students', value: users.filter(item => item.role === 'student').length, color: 'from-violet-600 to-fuchsia-500' },
            { label: 'Teacher/Staff', value: users.filter(item => item.role === 'faculty').length, color: 'from-emerald-600 to-teal-500' },
            { label: 'Admins', value: users.filter(item => item.role === 'admin').length, color: 'from-amber-500 to-orange-500' }
          ].map(stat => (
            <div key={stat.label} className={`rounded-xl bg-gradient-to-br ${stat.color} p-px`}>
              <div className="rounded-xl bg-slate-900 p-5">
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur sm:p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="inline-flex items-center gap-2 text-2xl font-bold">
              <FaUsers /> User Management
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(value => !value)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-700"
            >
              <FaUserPlus /> {showForm ? 'Close Form' : 'Add User'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAddUser} className="mb-6 grid gap-4 rounded-xl border border-white/10 bg-slate-950/70 p-4 md:grid-cols-2 lg:grid-cols-3">
              <input className="input-field" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full name" required />
              <input className="input-field" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Email" required />
              <input className="input-field" name="collegeId" value={formData.collegeId} onChange={handleInputChange} placeholder="College ID" required />
              <select className="input-field" name="role" value={formData.role} onChange={handleInputChange}>
                <option value="student">Student</option>
                <option value="faculty">Teacher/Staff</option>
                <option value="admin">Administrator</option>
              </select>
              <select className="input-field" name="department" value={formData.department} onChange={handleInputChange}>
                {['CSE', 'ECE', 'ME', 'CIVIL', 'EEE', 'BT', 'Other'].map(dep => <option key={dep} value={dep}>{dep}</option>)}
              </select>
              <input className="input-field" name="semester" type="number" min="1" max="8" value={formData.semester} onChange={handleInputChange} placeholder="Semester (students)" />
              <input className="input-field md:col-span-2" name="password" value={formData.password} onChange={handleInputChange} placeholder="Password (blank uses college ID)" />
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-3 font-semibold transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Create User'}
              </button>
            </form>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            {['all', 'student', 'faculty', 'admin'].map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${filter === item ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {item === 'all' ? 'All Users' : roleLabel(item)}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-white/10 text-left text-sm text-slate-300">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">College ID</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">First Login</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(item => (
                  <tr key={item._id} className="border-b border-white/5 transition hover:bg-white/[0.04]">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{item.email}</td>
                    <td className="px-4 py-3 text-slate-300">{item.collegeId}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-200">
                        {roleLabel(item.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.firstLogin ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
                        {item.firstLogin ? 'Required' : 'Complete'}
                      </span>
                    </td>
                    <td className="flex gap-2 px-4 py-3">
                      <button type="button" title="Edit user" className="rounded bg-blue-600 p-2 transition hover:bg-blue-700">
                        <FaPen size={14} />
                      </button>
                      <button type="button" title="Reset password" onClick={() => handleResetPassword(item)} disabled={saving} className="rounded bg-amber-600 p-2 transition hover:bg-amber-700 disabled:opacity-50">
                        <FaKey size={14} />
                      </button>
                      <button type="button" title="Delete user" onClick={() => handleDeleteUser(item)} disabled={saving || item._id === user?._id} className="rounded bg-red-600 p-2 transition hover:bg-red-700 disabled:opacity-50">
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-10 text-center text-slate-400">No users found.</div>
          )}
        </section>
      </main>
    </div>
  )
}
