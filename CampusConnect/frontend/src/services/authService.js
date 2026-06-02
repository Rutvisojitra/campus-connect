// Authentication Service - handles college ID based authentication

const STUDENTS_KEY = 'campusconnect_students';
const TEACHERS_KEY = 'campusconnect_teachers';
const ADMINS_KEY = 'campusconnect_admins';
const USER_SESSION_KEY = 'campusconnect_user_session';

const getAllTeachers = () => {
  const data = localStorage.getItem(TEACHERS_KEY);
  return data ? JSON.parse(data) : [];
};

const getAllAdmins = () => {
  const data = localStorage.getItem(ADMINS_KEY);
  return data ? JSON.parse(data) : [];
};

// Regex patterns for validation
const COLLEGE_ID_PATTERN = /^\d{2}[A-Z]{2}\d{3}$/; // 24CP001
const COLLEGE_EMAIL_PATTERN = /^\d{2}[a-z]{2}\d{3}@student\.college\.edu$/; // 24cp001@student.college.edu

/**
 * Validate College ID format
 */
export const validateCollegeID = (id) => {
  return COLLEGE_ID_PATTERN.test(id);
};

/**
 * Validate College Email format
 */
export const validateCollegeEmail = (email) => {
  return COLLEGE_EMAIL_PATTERN.test(email.toLowerCase());
};

/**
 * Generate College Email from College ID
 */
export const generateCollegeEmail = (collegeID) => {
  return `${collegeID.toLowerCase()}@student.college.edu`;
};

/**
 * Get all students from localStorage
 */
const getAllStudents = () => {
  const students = localStorage.getItem(STUDENTS_KEY);
  return students ? JSON.parse(students) : [];
};

/**
 * Save students to localStorage
 */
const saveStudents = (students) => {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
};

/**
 * Check if College ID already exists
 */
export const checkDuplicateCollegeID = (collegeID) => {
  const students = getAllStudents();
  return students.some(
    (student) => student.collegeID.toUpperCase() === collegeID.toUpperCase()
  );
};

/**
 * Check if Email already exists
 */
export const checkDuplicateEmail = (email) => {
  const students = getAllStudents();
  return students.some(
    (student) => student.email.toLowerCase() === email.toLowerCase()
  );
};

/**
 * Register new student (Sign Up)
 */
export const registerStudent = (fullName, collegeID, email) => {
  // Validations
  if (!fullName.trim()) {
    return { success: false, message: 'Full name is required' };
  }

  if (!validateCollegeID(collegeID)) {
    return {
      success: false,
      message: 'Invalid College ID format (e.g., 24CP001)',
    };
  }

  if (!validateCollegeEmail(email)) {
    return {
      success: false,
      message: 'Invalid College Email format (e.g., 24cp001@student.college.edu)',
    };
  }

  if (checkDuplicateCollegeID(collegeID)) {
    return {
      success: false,
      message: 'This College ID is already registered',
    };
  }

  if (checkDuplicateEmail(email)) {
    return {
      success: false,
      message: 'This Email is already registered',
    };
  }

  // Create new student with default password = College ID
  const newStudent = {
    id: Date.now().toString(),
    fullName: fullName.trim(),
    collegeID: collegeID.toUpperCase(),
    email: email.toLowerCase(),
    password: collegeID.toUpperCase(), // Default password
    passwordChanged: false, // Track if student changed password
    createdAt: new Date().toISOString(),
  };

  const students = getAllStudents();
  students.push(newStudent);
  saveStudents(students);

  return {
    success: true,
    message: 'Registration successful! Please login.',
    student: newStudent,
  };
};

/**
 * Login student using College ID or Email with Password and Role
 */
export const loginStudent = (identifier, password, role = 'student', rememberMe = false) => {
  // Validations
  if (!identifier || !password) {
    return { success: false, message: 'Please fill in all fields' };
  }

  let users = [];
  if (role === 'teacher') {
    users = getAllTeachers();
  } else if (role === 'admin') {
    users = getAllAdmins();
  } else {
    users = getAllStudents();
  }

  // Find user by College ID or Email
  const user = users.find(
    (u) =>
      (u.collegeID && u.collegeID.toUpperCase() === identifier.toUpperCase()) ||
      (u.email && u.email.toLowerCase() === identifier.toLowerCase())
  );

  if (!user) {
    return {
      success: false,
      message: `Account not found for role ${role === 'teacher' ? 'Staff/Teacher' : role === 'admin' ? 'Administrator' : 'Student'}!`,
    };
  }

  // Check password
  if (user.password !== password) {
    return { success: false, message: 'Incorrect password' };
  }

  // Create session
  const session = {
    id: user.id,
    fullName: user.fullName,
    collegeID: user.collegeID || '',
    email: user.email,
    role: role,
    passwordChanged: user.passwordChanged,
    loginTime: new Date().toISOString(),
    rememberMe: rememberMe,
  };

  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));

  return {
    success: true,
    message: 'Login successful!',
    student: session,
    requiresPasswordChange: !user.passwordChanged,
  };
};

/**
 * Get current user session
 */
export const getCurrentUser = () => {
  const session = localStorage.getItem(USER_SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

/**
 * Logout current user
 */
export const logoutUser = () => {
  localStorage.removeItem(USER_SESSION_KEY);
  return { success: true, message: 'Logged out successfully' };
};

/**
 * Change password for current user
 */
export const changePassword = (studentID, oldPassword, newPassword) => {
  // Validations
  if (!oldPassword || !newPassword) {
    return { success: false, message: 'All fields are required' };
  }

  if (newPassword.length < 6) {
    return {
      success: false,
      message: 'New password must be at least 6 characters',
    };
  }

  if (oldPassword === newPassword) {
    return {
      success: false,
      message: 'New password cannot be same as old password',
    };
  }

  const students = getAllStudents();
  const studentIndex = students.findIndex((s) => s.id === studentID);

  if (studentIndex === -1) {
    return { success: false, message: 'Student not found' };
  }

  const student = students[studentIndex];

  // Verify old password
  if (student.password !== oldPassword) {
    return { success: false, message: 'Old password is incorrect' };
  }

  // Update password
  student.password = newPassword;
  student.passwordChanged = true;

  saveStudents(students);

  // Update session
  const currentSession = getCurrentUser();
  if (currentSession) {
    currentSession.passwordChanged = true;
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentSession));
  }

  return { success: true, message: 'Password changed successfully!' };
};

/**
 * Initialize with demo data (for testing)
 */
export const initializeDemoData = () => {
  const existingStudents = getAllStudents();
  if (existingStudents.length === 0) {
    const demoStudents = [
      {
        id: '1',
        fullName: 'Rahul Verma',
        collegeID: '24CP001',
        email: '24cp001@student.college.edu',
        password: '24CP001',
        passwordChanged: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        fullName: 'Priya Sharma',
        collegeID: '24CP036',
        email: '24cp036@student.college.edu',
        password: '24CP036',
        passwordChanged: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        fullName: 'Aditya Kumar',
        collegeID: '24CP120',
        email: '24cp120@student.college.edu',
        password: '24CP120',
        passwordChanged: true,
        createdAt: new Date().toISOString(),
      },
    ];

    saveStudents(demoStudents);
  }

  const existingTeachers = getAllTeachers();
  if (existingTeachers.length === 0) {
    const demoTeachers = [
      {
        id: 't1',
        fullName: 'Prof. Sarah Jenkins',
        collegeID: 'TEACHER01',
        email: 'teacher@college.edu',
        password: 'password123',
        role: 'teacher',
        passwordChanged: true,
        createdAt: new Date().toISOString(),
      }
    ];
    localStorage.setItem(TEACHERS_KEY, JSON.stringify(demoTeachers));
  }

  const existingAdmins = getAllAdmins();
  if (existingAdmins.length === 0) {
    const demoAdmins = [
      {
        id: 'a1',
        fullName: 'Principal Dev Kumar',
        collegeID: 'ADMIN01',
        email: 'admin@college.edu',
        password: 'password123',
        role: 'admin',
        passwordChanged: true,
        createdAt: new Date().toISOString(),
      }
    ];
    localStorage.setItem(ADMINS_KEY, JSON.stringify(demoAdmins));
  }
};
