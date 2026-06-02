# 🚀 Quick Start Guide - CampusConnect

## 5-Minute Setup

### Step 1: Open 3 Terminals

### Terminal 1: Start MongoDB
```bash
mongod
```
(This starts your local MongoDB database)

### Terminal 2: Backend Setup & Run
```bash
cd CampusConnect/backend
npm install
npm run dev
```
✅ Backend ready at `http://localhost:5000`

### Terminal 3: Seed Database
```bash
cd CampusConnect/backend
node scripts/seedDatabase.js
```
✅ Sample users added to database

### Terminal 4: Frontend Setup & Run
```bash
cd CampusConnect/frontend
npm install
npm run dev
```
✅ Frontend ready at `http://localhost:3000`

---

## Test the Application

### Open Browser
Go to: **http://localhost:3000**

### First Time Flow

1. **Select Role**: Choose between Student, Teacher, or Admin
2. **Login**: Use demo credentials below
3. **Change Password**: Required for first login
4. **Dashboard**: Access role-specific dashboard

---

## 📝 Demo Credentials

### Option 1: Login as Student
- Email: `24cp036@student.college.com`
- Password: `24cp036` (then change it)

### Option 2: Login as Teacher
- Email: `ravi.patel@staff.college.com`
- Password: `Ravi@123` (then change it)

### Option 3: Login as Admin
- Email: `admin@college.com`
- Password: `Admin@123` (then change it)

---

## What You Can Do

### As a Student
- ✅ View your profile with college ID
- ✅ Check attendance
- ✅ Access notes and assignments
- ✅ View events
- ✅ Change password

### As a Teacher
- ✅ Manage classes
- ✅ Mark attendance
- ✅ Create assignments
- ✅ Record grades
- ✅ Post announcements

### As an Admin
- ✅ View all users
- ✅ Add new students/teachers
- ✅ Edit user information
- ✅ Reset passwords
- ✅ Delete users
- ✅ Filter by role

---

## File Structure Quick Reference

```
backend/
  ├── .env                    # Configuration file
  ├── server.js               # Main server file
  ├── package.json            # Dependencies
  └── routes/auth.js          # API routes

frontend/
  ├── .env                    # Configuration file
  ├── src/
  │   ├── pages/             # Page components
  │   ├── components/        # Reusable components
  │   ├── services/          # API calls
  │   └── AppNew.jsx         # Main routing
  └── tailwind.config.js     # Tailwind configuration
```

---

## Common Commands

```bash
# Backend
npm run dev              # Start dev server
npm run seed            # Seed database

# Frontend
npm run dev             # Start dev server
npm run build           # Build for production
```

---

## 🔧 Troubleshooting

### Can't Connect to Database?
```bash
# Start MongoDB
mongod
```

### Port 5000/3000 Already in Use?
```bash
# Windows: Find and kill process
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### Dependencies Not Installing?
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 🎨 Customization

### Change API URL
Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### Change Database
Edit `backend/.env`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/campusconnect
```

### Change Server Port
Edit `backend/.env`:
```env
PORT=3001
```

---

## 📚 Next Steps

1. **Explore the Code**: Check out the well-commented source files
2. **Add Features**: Extend with attendance, assignments, etc.
3. **Customize UI**: Modify colors and layouts in Tailwind config
4. **Deploy**: Use Heroku for backend, Vercel for frontend
5. **Database**: Switch to MongoDB Atlas for cloud hosting

---

## ✨ Key Features

✅ Role-based authentication (Student/Teacher/Admin)
✅ Modern, responsive UI with Tailwind CSS
✅ JWT token-based security
✅ First login password change requirement
✅ Smooth animations and transitions
✅ API-driven architecture
✅ MongoDB database integration
✅ Protected routes and role-based access

---

## 📞 Need Help?

- Check `IMPLEMENTATION_GUIDE.md` for detailed documentation
- Review error messages in browser console
- Check backend logs in terminal
- Verify MongoDB is running
- Ensure all dependencies are installed

---

**Happy Testing! 🎓**

Last Updated: 2024
