// scripts/seedDatabase.js
// ============================================================
// Seed Database with Sample Users
// Run: npm run seed
// ============================================================

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bcryptjs from 'bcryptjs'
import User from '../models/User.js'
import connectDB from '../config/database.js'

dotenv.config()

const seedDatabase = async () => {
  try {
    await connectDB()

    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB is not connected. Check MONGO_URI and start MongoDB before seeding.')
    }

    // Clear existing users
    await User.deleteMany({})
    console.log('�n✓ Cleared existing users')

    // Sample Students
    const students = [
      {
        name: 'Raj Kumar',
        email: '24cp036@student.college.edu',
        password: '24cp036', // College ID as default password
        collegeId: '24cp036',
        role: 'student',
        department: 'CSE',
        semester: 4,
        firstLogin: true
      },
      {
        name: 'Priya Sharma',
        email: '24cp041@student.college.edu',
        password: '24cp041', // College ID as default password
        collegeId: '24cp041',
        role: 'student',
        department: 'CSE',
        semester: 4,
        firstLogin: true
      }
    ]

    // Sample Teachers/Staff
    const teachers = [
      {
        name: 'Ravi Patel',
        email: 'ravi.patel@staff.college.com',
        password: 'Ravi@123',
        collegeId: 'staff001',
        role: 'faculty',
        department: 'CSE',
        firstLogin: true
      },
      {
        name: 'Neha Shah',
        email: 'neha.shah@staff.college.com',
        password: 'Neha@123',
        collegeId: 'staff002',
        role: 'faculty',
        department: 'CSE',
        firstLogin: true
      }
    ]

    // Sample Admin
    const admin = {
      name: 'Administrator',
      email: 'admin@college.com',
      password: 'Admin@123',
      collegeId: 'admin001',
      role: 'admin',
      firstLogin: true
    }

    // Create all users
    const allUsers = [...students, ...teachers, admin]
    
    for (let user of allUsers) {
      const newUser = new User(user)
      await newUser.save()
    }

    console.log('✓ Created 2 Student users')
    console.log('  - 24cp036@student.college.edu / 24cp036')
    console.log('  - 24cp041@student.college.edu / 24cp041')
    console.log('\n✓ Created 2 Teacher/Staff users')
    console.log('  - ravi.patel@staff.college.com / Ravi@123')
    console.log('  - neha.shah@staff.college.com / Neha@123')
    console.log('\n✓ Created 1 Admin user')
    console.log('  - admin@college.com / Admin@123')
    console.log('\n✓ Database seeded successfully!')

    process.exit(0)
  } catch (error) {
    console.error('✗ Error seeding database:', error.message)
    process.exit(1)
  }
}

// Run seeding
seedDatabase()
