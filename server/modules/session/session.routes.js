const express = require('express');
const { authenticate } = require('../common/auth.middleware');
const { createSession, getAllSession, joinSession, getSession, endSession } = require('./session.service');

const createSessionRouter = (io) => {
  const sessionRouter = express.Router();

  sessionRouter.post('/', authenticate, async (req, res) => {
    const userId = req.user.userId;

    try {
      const { title, description } = req.body;
      const newSession = await createSession({ title, description }, userId);
      res.status(201).json({
        message: 'Session created successfully',
        session: newSession
      });
    } catch (error) {
      console.error('Session creation error:', error);
      if (error.status && error.payload) {
        return res.status(error.status).json(error.payload);
      }
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  sessionRouter.get('/', authenticate, async (req, res) => {
    const userId = req.user.userId;

    try {
      const sessions = await getAllSession({}, userId);
      res.status(200).json(sessions);
    } catch (error) {
      if (error.status && error.payload) {
        return res.status(error.status).json(error.payload);
      }
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  sessionRouter.post('/:id/join', authenticate, async (req, res) => {
    const userId = req.user.userId;
    const sessionData = { id: req.params.id };

    try {
      const result = await joinSession(sessionData, userId);
      res.status(200).json(result);
    } catch (error) {
      if (error.status && error.payload) {
        return res.status(error.status).json(error.payload);
      }
      res.status(500).json({ error: 'Failed to join session' });
    }
  });

  sessionRouter.post('/:id/end', authenticate, async (req, res) => {
    const userId = req.user.userId;
    const sessionData = { id: req.params.id };

    try {
      const result = await endSession(sessionData, userId);
      io.emit('sessionStatus', { active: false });
      io.emit('sessionEnded');
      res.status(200).json(result);
    } catch (error) {
      console.error('Failed to end session via API:', error);
      if (error.status && error.payload) {
        return res.status(error.status).json(error.payload);
      }
      res.status(500).json({ error: 'Failed to end session' });
    }
  });

  sessionRouter.get('/:id', authenticate, async (req, res) => {
    const userId = req.user.userId;
    const sessionData = { id: req.params.id };

    try {
      const session = await getSession(sessionData, userId);
      res.status(200).json(session);
    } catch (error) {
      if (error.status && error.payload) {
        return res.status(error.status).json(error.payload);
      }
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  return sessionRouter;
};

module.exports = createSessionRouter;
