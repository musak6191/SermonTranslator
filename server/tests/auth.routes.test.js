import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: vi.fn().mockResolvedValue({}) } }))
}));

vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<div>Reset</div>')
}));

vi.mock('@react-email/components', () => ({
  Html: 'html', Body: 'body', Container: 'div', Text: 'span', Heading: 'h1', Button: 'a'
}));

const prisma = new PrismaClient();
const authRouter = (await import('../modules/auth/auth.routes.js')).default;

function createApp(router) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(router);
  return app;
}

async function request(app, path, options = {}) {
  const server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: options.method || 'GET',
    headers: {
      'connection': 'close',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.cookie ? { cookie: options.cookie } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = text; }
  await new Promise(r => server.close(r));
  return { response, payload };
}

describe('auth routes catch-block coverage', () => {
  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.CLIENT_BASE_URL = 'http://localhost:5173';
    await prisma.$transaction([
      prisma.translation.deleteMany(),
      prisma.session.deleteMany(),
      prisma.pushSubscription.deleteMany(),
      prisma.forumComment.deleteMany(),
      prisma.forumPost.deleteMany(),
      prisma.user.deleteMany()
    ]);
  });

  it('returns service error when /me is called with a non-existent user', async () => {
    const app = createApp(authRouter);
    const token = jwt.sign({ userId: 999999 }, 'test-secret');

    const res = await request(app, '/me', {
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(404);
    expect(res.payload.error).toBe('User not found');
  });

  it('returns service error when /request-password-change is called with a non-existent user', async () => {
    const app = createApp(authRouter);
    const token = jwt.sign({ userId: 999999 }, 'test-secret');

    const res = await request(app, '/request-password-change', {
      method: 'POST',
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(404);
    expect(res.payload.error).toBe('User not found');
  });

  it('returns service error when /reset-password-with-token is called with an invalid token', async () => {
    const app = createApp(authRouter);

    const res = await request(app, '/reset-password-with-token', {
      method: 'POST',
      body: { token: 'not-a-real-jwt', newPassword: 'StrongP@ss1' }
    });

    expect(res.response.status).toBe(400);
    expect(res.payload.error).toBe('Invalid token');
  });

  it('returns service error when /reset-password-with-token has missing fields', async () => {
    const app = createApp(authRouter);

    const res = await request(app, '/reset-password-with-token', {
      method: 'POST',
      body: { token: '', newPassword: '' }
    });

    expect(res.response.status).toBe(400);
    expect(res.payload.error).toBe('Token and new password are required');
  });

  it('returns service error when /login is called with missing credentials', async () => {
    const app = createApp(authRouter);

    const res = await request(app, '/login', {
      method: 'POST',
      body: { email: '', password: '' }
    });

    expect(res.response.status).toBe(400);
    expect(res.payload.error).toBe('Email and password are required');
  });

  it('returns a successful login with cookie when credentials are valid', async () => {
    const hashedPassword = await bcrypt.hash('StrongP@ss1', 10);
    await prisma.user.create({
      data: { name: 'User', email: 'login@example.com', password: hashedPassword, role: 'listener' }
    });

    const app = createApp(authRouter);
    const res = await request(app, '/login', {
      method: 'POST',
      body: { email: 'login@example.com', password: 'StrongP@ss1' }
    });

    expect(res.response.status).toBe(200);
    expect(res.payload.message).toBe('Login successful');
  });
});
