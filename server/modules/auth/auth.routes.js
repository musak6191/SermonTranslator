const express = require('express');
const rateLimit = require('express-rate-limit');
const { render } = require('@react-email/render');
const React = require('react');
const { Html, Body, Container, Text, Heading, Button } = require('@react-email/components');
const { Resend } = require('resend');
const { authenticate } = require('../common/auth.middleware');
const { registerUser, loginUser, logoutUser, getCurrentUserInfo, requestPasswordChange, resetPasswordWithToken } = require('./auth.service');

const authRouter = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 12 : 1000,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 12 : 1000,
  message: 'Too many registrations, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const sendPasswordResetEmail = async (email, resetUrl) => {
  try {
    const emailHtml = await render(
      React.createElement(Html, null,
        React.createElement(Body, { style: { backgroundColor: '#F4F8F5', fontFamily: 'sans-serif' } },
          React.createElement(Container, { style: { padding: '40px 20px', textAlign: 'center' } },
            React.createElement(Heading, { style: { color: '#0C3B28', fontSize: '24px' } }, 'Password Reset Request'),
            React.createElement(Text, { style: { color: '#4C6E4E', fontSize: '16px', marginBottom: '24px' } },
              'You recently requested to change your password for your Sermon Translator account. Click the button below to proceed.'
            ),
            React.createElement(Button, {
              href: resetUrl,
              style: { backgroundColor: '#288C49', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }
            }, 'Change Password'),
            React.createElement(Text, { style: { color: '#4C6E4E', fontSize: '14px', marginTop: '24px' } },
              'If you did not request a password change, please ignore this email.'
            )
          )
        )
      )
    );

    console.log('\n======================================================');
    console.log(`[TESTING MODE] Password Reset Link for ${email}:`);
    console.log(resetUrl);
    console.log('======================================================\n');

    await resend.emails.send({
      from: 'Sermon Translator <onboarding@resend.dev>',
      to: email,
      subject: 'Change Your Password',
      html: emailHtml
    });
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }
};

authRouter.post('/register', registerLimiter, async (req, res) => {
  const { name, email, password, role } = req.body;
  const userId = req.user?.userId;

  try {
    const newUser = await registerUser({ name, email, password, role }, userId);
    res.status(201).json({
      message: 'User registered successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to register user' });
  }
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const userId = req.user?.userId;

  try {
    const user = await loginUser({ email, password }, userId);
    const token = require('jsonwebtoken').sign(
      {
        userId: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to login' });
  }
});

authRouter.post('/logout', async (req, res) => {
  const userId = req.user?.userId;

  try {
    const result = await logoutUser({}, userId);
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Logout error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to logout' });
  }
});

authRouter.get('/me', authenticate, async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await getCurrentUserInfo({}, userId);
    res.status(200).json({ user });
  } catch (error) {
    console.error('Fetch current user info error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

authRouter.post('/request-password-change', authenticate, async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await requestPasswordChange({}, userId);
    sendPasswordResetEmail(result.email, result.resetUrl);
    res.status(200).json({ message: result.message });
  } catch (error) {
    console.error('Password reset request error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to request password change' });
  }
});

authRouter.post('/reset-password-with-token', async (req, res) => {
  const { token, newPassword } = req.body;
  const userId = null;

  try {
    const result = await resetPasswordWithToken({ token, newPassword }, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Password reset error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = authRouter;
