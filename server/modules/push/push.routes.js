const express = require('express');
const { authenticate } = require('../common/auth.middleware');
const { savePushSubscription } = require('./push.service');

const pushRouter = express.Router();

pushRouter.post('/subscribe', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { endpoint, keys } = req.body;
  const requestData = { endpoint, keys };

  try {
    const subscription = await savePushSubscription(requestData, userId);
    res.status(201).json({
      message: 'Push subscription saved successfully',
      subscription
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

module.exports = pushRouter;
