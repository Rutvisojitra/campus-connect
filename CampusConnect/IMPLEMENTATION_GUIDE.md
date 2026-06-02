# College Management System - Complete Implementation Guide

## 🎓 Project Overview

A modern College Management System with role-based login and dashboards built with React, Node.js, Express, and MongoDB. The system includes:

- **Role-Based Access Control**: Student, Teacher/Staff, and Admin roles
- **JWT Authentication**: Secure token-based authentication
- **First Login Password Change**: Required password change on first login
- **Modern UI**: Responsive design with Tailwind CSS
- **MongoDB Database**: Persistent data storage with mongoose
- **API-Driven Architecture**: RESTful API with proper error handling

---

## 📋 Table of Contents

1. [Features](#features)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Demo Credentials](#demo-credentials)
10. [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Authentication & Authorization
- ✅ Role-based login (Student, Teacher/Staff, Admin)
- ✅ Email and password authentication
- ✅ JWT token-based session management
- ✅ "Remember me" functionality
- ✅ First login password change requirement
- ✅ Secure password hashing with bcryptjs

### User Management (Admin)
- ✅ Add new students, teachers, and staff
- ✅ Edit user information
- ✅ Reset user passwords
- ✅ Deactivate/activate users
- ✅ Delete users from system
- ✅ View all users with filtering

### Dashboards
- **Student Dashboard**: View attendance, assignments, notes, events
- **Teacher Dashboard**: Manage classes, mark attendance, create assignments
- **Admin Dashboard**: Complete user management and system control

### UI/UX
- ✅ Modern, animated interface
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dark theme with gradient backgrounds
- ✅ Loading animations
- ✅ Error handling and validation
- ✅ Toast notifications

---

## 📁 Project Structure

```
CampusConnect/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorHandler.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── auth.js
│   ├── scripts/
│   │   └── seedDatabase.js
│   ├── utils/
│   │   └── jwt.js
│   ├── .env
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── RoleSelection.jsx
│   │   │   ├── LoginNew.jsx
│   │   │   ├── ChangePassword.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── TeacherDashboard.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx
│   │   ├── services/
│   │   │   └── apiClient.js
│   │   ├── styles/
│   │   │   └── index.css
│   │   ├── AppNew.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
│
├── README.md
└── SETUP.md
```

---

## 🛠 Prerequisites

Before running the application, ensure you have:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **npm** or **yarn** package manager
- **Git** for version control

### Verify Installation

```bash
node --version
npm --version
mongod --version
```

---

## 📦 Installation

### Step 1: Clone or Navigate to Project

```bash
cd CampusConnect
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### Step 4: Return to Root Directory

```bash
cd ../
```

---

## ⚙️ Configuration

### Backend Configuration (.env)

Create/update `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/campusconnect

# JWT Configuration
JWT_SECRET=campusconnect-secret-key-change-in-production
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Frontend Configuration (.env)

Create/update `frontend/.env`:

```env
# API URL
VITE_API_URL=http://localhost:5000/api
```

### MongoDB Setup

1. **Start MongoDB Server**:
   ```bash
   mongod
   ```

2. **Seed Database with Sample Data**:
   ```bash
   cd backend
   npm run seed
   # or
   node scripts/seedDatabase.js
   ```

---

## 🚀 Running the Application

### Terminal 1: Start MongoDB

```bash
mongod
```

### Terminal 2: Start Backend Server

```bash
cd backend
npm run dev
# Backend running on http://localhost:5000
```

### Terminal 3: Start Frontend Development Server

```bash
cd frontend
npm run dev
# Frontend running on http://localhost:3000
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔌 API Endpoints

### Authentication Routes

#### 1. Login
- **POST** `/api/auth/login`
- **Body**:
  ```json
  {
    "email": "24cp036@student.college.com",
    "password": "24cp036",
    "rememberMe": false
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "...",
      "name": "Raj Kumar",
      "email": "24cp036@student.college.com",
      "role": "student",
      "collegeId": "24cp036",
      "firstLogin": true
    }
  }
  ```

#### 2. Signup (Admin Only)
- **POST** `/api/auth/signup`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@student.college.com",
    "password": "Secure@123",
    "collegeId": "24cp045",
    "role": "student",
    "department": "CSE",
    "semester": 4
  }
  ```

#### 3. Change Password
- **PUT** `/api/auth/change-password`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "currentPassword": "24cp036",
    "newPassword": "NewPassword@123",
    "confirmPassword": "NewPassword@123"
  }
  ```

#### 4. Get User Profile
- **GET** `/api/auth/profile`
- **Headers**: `Authorization: Bearer <token>`

#### 5. Logout
- **POST** `/api/auth/logout`

#### 6. Get All Users (Admin Only)
- **GET** `/api/auth/users`
- **Headers**: `Authorization: Bearer <token>`

#### 7. Update User (Admin Only)
- **PUT** `/api/auth/users/:userId`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "Updated Name",
    "email": "newemail@college.com",
    "isActive": true
  }
  ```

#### 8. Reset Password (Admin Only)
- **POST** `/api/auth/users/:userId/reset-password`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "newPassword": "TempPassword@123"
  }
  ```

#### 9. Delete User (Admin Only)
- **DELETE** `/api/auth/users/:userId`
- **Headers**: `Authorization: Bearer <token>`

---

## 📊 Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  collegeId: String (required, unique),
  role: String (enum: ['student', 'faculty', 'admin']),
  firstLogin: Boolean (default: true),
  department: String,
  semester: Number,
  phone: String,
  address: String,
  profileImage: String,
  isActive: Boolean (default: true),
  isVerified: Boolean (default: false),
  darkMode: Boolean (default: false),
  notifications: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 👥 Demo Credentials

### Students

| Email | Password | College ID |
|-------|----------|-----------|
| 24cp036@student.college.com | 24cp036 | 24cp036 |
| 24cp041@student.college.com | 24cp041 | 24cp041 |

### Teachers/Staff

| Email | Password | College ID |
|-------|----------|-----------|
| ravi.patel@staff.college.com | Ravi@123 | STAFF001 |
| neha.shah@staff.college.com | Neha@123 | STAFF002 |

### Administrator

| Email | Password | College ID |
|-------|----------|-----------|
| admin@college.com | Admin@123 | ADMIN001 |

**Note**: All users must change their password on first login.

---

## 🔐 Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Password Hashing**: bcryptjs with 10 salt rounds
3. **CORS Protection**: Configured CORS for frontend-backend communication
4. **Role-Based Access Control**: Middleware for checking user roles
5. **Input Validation**: Server-side validation on all endpoints
6. **Protected Routes**: Frontend routes protected with ProtectedRoute component
7. **Token Storage**: Secure localStorage for JWT tokens
8. **First Login Requirement**: Mandatory password change on first login

---

## 🎨 UI/UX Features

- **Modern Design**: Gradient backgrounds and smooth animations
- **Responsive Layout**: Mobile-first approach with Tailwind CSS
- **Dark Theme**: Easy on the eyes with slate and dark backgrounds
- **Loading States**: Animated loading indicators
- **Error Handling**: User-friendly error messages
- **Success Notifications**: Visual feedback for actions
- **Icon Integration**: React Icons for visual elements
- **Backdrop Blur**: Modern glassmorphism effects

---

## 🐛 Troubleshooting

### MongoDB Connection Error

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:27017`

**Solution**:
```bash
# Ensure MongoDB is running
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env to your cloud connection string
```

### Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find and kill process using port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

### CORS Error

**Problem**: `Access to XMLHttpRequest at 'http://localhost:5000/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution**: Ensure FRONTEND_URL in backend/.env is correctly set to `http://localhost:3000`

### Module Not Found

**Problem**: `Cannot find module 'express'`

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### First Login Not Working

**Problem**: User cannot change password on first login

**Solution**: 
- Ensure `firstLogin` field is set to `true` for new users
- Check that JWT token is properly stored in localStorage
- Verify token is being sent in Authorization header

---

## 📝 Scripts

### Backend Scripts

```bash
# Development server (auto-restart with nodemon)
npm run dev

# Production server
npm start

# Seed database with sample data
node scripts/seedDatabase.js
```

### Frontend Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

---

## 🚀 Deployment

### Backend Deployment (Heroku/Railway)

1. Create account on hosting platform
2. Set environment variables
3. Push code to git repository
4. Deploy

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to Vercel/Netlify

---

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [JWT.io](https://jwt.io/)

---

## 📞 Support

For issues, questions, or suggestions, please create an issue or contact the development team.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Coding! 🎓**
