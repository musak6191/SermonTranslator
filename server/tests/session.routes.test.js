import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const createSessionRouter = (await import('../modules/session/session.routes.js')).default;

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

describe('session routes catch-block coverage', () => {
  const mockIo = { emit: vi.fn() };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    await prisma.$transaction([
      prisma.translation.deleteMany(),
      prisma.session.deleteMany(),
      prisma.pushSubscription.deleteMany(),
      prisma.forumComment.deleteMany(),
      prisma.forumPost.deleteMany(),
      prisma.user.deleteMany()
    ]);
  });

  it('returns 403 when a non-imam tries to create a session via POST /', async () => {
    const listener = await prisma.user.create({
      data: { name: 'Listener', email: 'listener@example.com', password: 'hashed-password', role: 'listener' }
    });
    const token = jwt.sign({ userId: listener.id }, 'test-secret');
    const app = createApp(createSessionRouter(mockIo));

    const res = await request(app, '/', {
      method: 'POST',
      body: { title: 'Test', description: 'Desc' },
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(403);
    expect(res.payload.error).toBe('Only imams can create sessions');
  });

  it('returns 400 when POST /:id/join is called with an invalid session id', async () => {
    const user = await prisma.user.create({
      data: { name: 'User', email: 'user@example.com', password: 'hashed-password', role: 'listener' }
    });
    const token = jwt.sign({ userId: user.id }, 'test-secret');
    const app = createApp(createSessionRouter(mockIo));

    const res = await request(app, '/abc/join', {
      method: 'POST',
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(400);
    expect(res.payload.error).toBe('Invalid session ID');
  });

  it('returns 400 when POST /:id/end is called with an invalid session id', async () => {
    const imam = await prisma.user.create({
      data: { name: 'Imam', email: 'imam@example.com', password: 'hashed-password', role: 'imam' }
    });
    const token = jwt.sign({ userId: imam.id }, 'test-secret');
    const app = createApp(createSessionRouter(mockIo));

    const res = await request(app, '/abc/end', {
      method: 'POST',
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(400);
    expect(res.payload.error).toBe('Invalid session ID');
  });

  it('returns 403 when a non-owner tries to end a session via POST /:id/end', async () => {
    const imam = await prisma.user.create({
      data: { name: 'Imam', email: 'imam@example.com', password: 'hashed-password', role: 'imam' }
    });
    const otherUser = await prisma.user.create({
      data: { name: 'Other', email: 'other@example.com', password: 'hashed-password', role: 'imam' }
    });
    const session = await prisma.session.create({
      data: { imamId: imam.id, title: 'Session', description: 'Desc' }
    });
    const token = jwt.sign({ userId: otherUser.id }, 'test-secret');
    const app = createApp(createSessionRouter(mockIo));

    const res = await request(app, `/${session.id}/end`, {
      method: 'POST',
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(403);
    expect(res.payload.error).toBe('Only the session imam can end this session');
  });

  it('returns 400 when GET /:id is called with an invalid session id', async () => {
    const user = await prisma.user.create({
      data: { name: 'User', email: 'user@example.com', password: 'hashed-password', role: 'listener' }
    });
    const token = jwt.sign({ userId: user.id }, 'test-secret');
    const app = createApp(createSessionRouter(mockIo));

    const res = await request(app, '/abc', {
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(400);
    expect(res.payload.error).toBe('Invalid session ID');
  });
});
