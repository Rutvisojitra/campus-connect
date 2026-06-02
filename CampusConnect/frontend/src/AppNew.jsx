import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './styles/App.css'

// Context & Overlay for Auto-Reconnect
import { ServerStatusProvider } from './context/ServerStatusContext'
import { AttendanceProvider } from './context/AttendanceContext'
import ReconnectingOverlay from './components/ReconnectingOverlay'
import { useAuth } from './context/AuthContext'

// Pages
import RoleSelection from './pages/RoleSelection'
import LoginNew from './pages/LoginNew'
import Register from './pages/Register'
import ChangePassword from './pages/ChangePassword'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import AdminDashboard from './pages/AdminDashboard'

// Components
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const { user, loading } = useAuth()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(current => current === 'dark' ? 'light' : 'dark')

  const getDashboardPath = (role) => {
    if (role === 'student') return '/student-dashboard'
    if (role === 'faculty') return '/teacher-dashboard'
    if (role === 'admin') return '/admin-dashboard'
    return '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 rounded-full border-4 border-blue-400 border-t-transparent animate-spin" />
          <p className="text-lg">Restoring your session...</p>
        </div>
      </div>
    )
  }

  return (
    <ServerStatusProvider>
      <AttendanceProvider>
        <Router>
          <Routes>
          {/* Role Selection - Entry Point */}
          <Route
            path="/"
            element={
              user
                ? user.firstLogin
                  ? <Navigate to="/change-password" replace />
                  : <Navigate to={getDashboardPath(user.role)} replace />
                : <RoleSelection theme={theme} onToggleTheme={toggleTheme} />
            }
          />

          {/* Authentication Routes */}
          <Route path="/login" element={user ? <Navigate to={getDashboardPath(user.role)} replace /> : <LoginNew theme={theme} onToggleTheme={toggleTheme} />} />
          <Route path="/register" element={user ? <Navigate to={getDashboardPath(user.role)} replace /> : <Register theme={theme} onToggleTheme={toggleTheme} />} />
          <Route 
            path="/change-password" 
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } 
          />

          {/* Dashboard Routes */}
          <Route 
            path="/student-dashboard" 
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/teacher-dashboard" 
            element={
              <ProtectedRoute requiredRole="faculty">
                <TeacherDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Catch All - Redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Router>
      </AttendanceProvider>
      <ReconnectingOverlay />
    </ServerStatusProvider>
  )
}

export default App
