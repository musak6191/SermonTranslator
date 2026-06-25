const express = require('express');
const { authenticate } = require('../common/auth.middleware');
const { createUser, getAllUser } = require('./users.service');

const usersRouter = express.Router();

usersRouter.post('/', authenticate, async (req, res) => {
  const userId = req.user.userId;

  try {
    const { name, email, password } = req.body;
    const newUser = await createUser({ name, email, password }, userId);
    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('User creation error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

usersRouter.get('/', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const requestData = { ...req.body };

  try {
    const users = await getAllUser(requestData, userId);
    res.status(200).json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = usersRouter;
