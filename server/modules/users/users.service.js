const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createUser = async (data, userId) => {
  const { name, role, email, password } = data;

  if (!name || !role) {
    const error = new Error('Missing required fields');
    error.status = 400;
    error.payload = {
      error: 'Missing required fields',
      required: ['name', 'role']
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

  // Provide defaults for email and password if not supplied
  const userEmail = email || `${name.replace(/\s+/g, '').toLowerCase()}-${Date.now()}@generated.local`;
  const userPassword = password || 'defaultPassword123';

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      role: role.trim(),
      email: userEmail,
      password: userPassword
    }
  });

  return newUser;
};

const getAllUser = async (data, userId) => {
  if (!userId) {
    const error = new Error('User must be authenticated');
    error.status = 401;
    error.payload = {
      error: 'User must be authenticated'
    };
    throw error;
  }

  const users = await prisma.user.findMany();
  return users;
};

module.exports = {
  createUser,
  getAllUser
};
