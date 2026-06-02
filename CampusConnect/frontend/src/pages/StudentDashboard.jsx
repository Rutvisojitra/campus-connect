import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaUser, FaRightFromBracket, FaBook, FaCalendar, FaClipboard, FaFileLines } from 'react-icons/fa6'
import authService from '../services/apiClient'
import StudentQRScanner from '../components/attendance/StudentQRScanner'
import AttendanceStats from '../components/attendance/AttendanceStats'

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loggedInUser = authService.getLocalUser()
    if (!loggedInUser) {
      navigate('/login')
      return
    }
    setUser(loggedInUser)
    setLoading(false)
  }, [navigate])

  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⊙</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navbar */}
      <nav className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">🎓 Student Portal</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-semibold">{user?.name}</p>
              <p className="text-sm text-gray-400">{user?.collegeId}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition"
            >
              <FaRightFromBracket /> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12 p-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl text-white shadow-lg">
          <h2 className="text-3xl font-bold mb-2">Welcome, {user?.name}! 👋</h2>
          <p className="text-blue-100">Student ID: {user?.collegeId}</p>
          <p className="text-blue-100 text-sm mt-2">Email: {user?.email}</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: FaCalendar,
              title: 'Attendance',
              description: 'View and check attendance',
              color: 'from-purple-600 to-purple-500'
            },
            {
              icon: FaBook,
              title: 'Notes',
              description: 'Access study materials',
              color: 'from-green-600 to-green-500'
            },
            {
              icon: FaClipboard,
              title: 'Assignments',
              description: 'Submit assignments',
              color: 'from-orange-600 to-orange-500'
            },
            {
              icon: FaFileLines,
              title: 'Results',
              description: 'Check exam results',
              color: 'from-pink-600 to-pink-500'
            },
            {
              icon: FaCalendar,
              title: 'Events',
              description: 'College events & activities',
              color: 'from-cyan-600 to-cyan-500'
            },
            {
              icon: FaUser,
              title: 'Profile',
              description: 'Manage your profile',
              color: 'from-indigo-600 to-indigo-500'
            }
          ].map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={index}
                className={`
                  bg-gradient-to-br ${item.color} p-1 rounded-xl
                  hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer
                `}
              >
                <div className="bg-slate-800 rounded-lg p-6 h-full">
                  <Icon className="text-3xl text-white mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mb-12 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <StudentQRScanner />
          <AttendanceStats />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            { label: 'Assignments', value: '8/10', color: 'from-purple-600 to-purple-500' },
            { label: 'Courses', value: '6', color: 'from-orange-600 to-orange-500' }
          ].map((stat, index) => (
            <div key={index} className={`bg-gradient-to-br ${stat.color} p-1 rounded-lg`}>
              <div className="bg-slate-800 rounded p-4 text-center">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
