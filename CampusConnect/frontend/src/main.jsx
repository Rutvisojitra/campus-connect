// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './AppNew'
import { AuthProvider } from './context/AuthContext'
import './styles/index.css'
import './styles/App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
