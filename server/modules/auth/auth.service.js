const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const registerUser = async (data, userId) => {
  const { name, email, password, role } = data;

  if (!name || !email || !password || !role) {
    const error = new Error('Missing required fields');
    error.status = 400;
    error.payload = {
      error: 'Missing required fields',
      required: ['name', 'email', 'password', 'role']
    };
    throw error;
  }

  if (!['imam', 'listener'].includes(role)) {
    const error = new Error('Invalid role');
    error.status = 400;
    error.payload = {
      error: 'Invalid role. Must be "imam" or "listener"'
    };
    throw error;
  }

  if (!validatePassword(password)) {
    const error = new Error('Weak password');
    error.status = 400;
    error.payload = {
      error: 'Password must be at least 8 characters and contain uppercase letter, lowercase letter, number, and special character (@$!%*?&)'
    };
    throw error;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
    const error = new Error('Email already registered');
    error.status = 409;
    error.payload = {
      error: 'Email already registered'
    };
    throw error;
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role.trim()
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  return newUser;
};

const loginUser = async (data, userId) => {
  const { email, password } = data;

  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    error.payload = {
      error: 'Email and password are required'
    };
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    error.payload = {
      error: 'Invalid email or password'
    };
    throw error;
  }

  return user;
};

const logoutUser = async (data, userId) => {
  return {
    message: 'Logout successful'
  };
};

const getCurrentUserInfo = async (data, userId) => {
  if (!userId) {
    const error = new Error('User must be authenticated');
    error.status = 401;
    error.payload = {
      error: 'User must be authenticated'
    };
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    error.payload = {
      error: 'User not found'
    };
    throw error;
  }

  return user;
};

const requestPasswordChange = async (data, userId) => {
  if (!userId) {
    const error = new Error('User must be authenticated');
    error.status = 401;
    error.payload = {
      error: 'User must be authenticated'
    };
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    error.payload = {
      error: 'User not found'
    };
    throw error;
  }

  const secret = process.env.JWT_SECRET + user.password;
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '15m' });
  const resetUrl = `http://localhost:5173/settings?token=${token}`;

  return {
    email: user.email,
    resetUrl,
    message: 'Password reset email sent'
  };
};

const resetPasswordWithToken = async (data, userId) => {
  const { token, newPassword } = data;

  if (!token || !newPassword) {
    const error = new Error('Token and new password are required');
    error.status = 400;
    error.payload = {
      error: 'Token and new password are required'
    };
    throw error;
  }

  const decoded = jwt.decode(token);
  if (!decoded || !decoded.userId) {
    const error = new Error('Invalid token');
    error.status = 400;
    error.payload = {
      error: 'Invalid token'
    };
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    error.payload = {
      error: 'User not found'
    };
    throw error;
  }

  const secret = process.env.JWT_SECRET + user.password;
  try {
    jwt.verify(token, secret);
  } catch (err) {
    const error = new Error('Invalid or expired token');
    error.status = 400;
    error.payload = {
      error: 'Invalid or expired token'
    };
    throw error;
  }

  if (!validatePassword(newPassword)) {
    const error = new Error('Weak password');
    error.status = 400;
    error.payload = {
      error: 'Password must be at least 8 characters and contain uppercase letter, lowercase letter, number, and special character (@$!%*?&)' 
    };
    throw error;
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  return {
    message: 'Password updated successfully'
  };
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUserInfo,
  requestPasswordChange,
  resetPasswordWithToken
};
