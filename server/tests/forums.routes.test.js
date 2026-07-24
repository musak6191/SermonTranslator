import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const forumsRouter = (await import('../modules/forums/forums.routes.js')).default;

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

describe('forums routes catch-block coverage', () => {
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

  it('returns service error when GET / is called with null userId', async () => {
    const app = createApp(forumsRouter);
    const token = jwt.sign({ userId: null }, 'test-secret');

    const res = await request(app, '/', {
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(401);
    expect(res.payload.error).toBe('User must be authenticated');
  });

  it('returns service error when GET /:id/comments is called with null userId', async () => {
    const app = createApp(forumsRouter);
    const token = jwt.sign({ userId: null }, 'test-secret');

    const res = await request(app, '/123/comments', {
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(401);
    expect(res.payload.error).toBe('User must be authenticated');
  });

  it('returns service error when POST / is called with missing title and content', async () => {
    const app = createApp(forumsRouter);
    const user = await prisma.user.create({
      data: { name: 'User', email: 'user@example.com', password: 'hashed-password', role: 'listener' }
    });
    const token = jwt.sign({ userId: user.id }, 'test-secret');

    const res = await request(app, '/', {
      method: 'POST',
      body: {},
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(400);
    expect(res.payload.error).toBe('Missing title or content');
  });

  it('returns service error when POST /:id/comments is called with missing content', async () => {
    const app = createApp(forumsRouter);
    const user = await prisma.user.create({
      data: { name: 'User', email: 'user@example.com', password: 'hashed-password', role: 'listener' }
    });
    const token = jwt.sign({ userId: user.id }, 'test-secret');

    const res = await request(app, '/123/comments', {
      method: 'POST',
      body: {},
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(400);
    expect(res.payload.error).toBe('Missing comment content');
  });

  it('successfully creates a forum post and retrieves forums', async () => {
    const app = createApp(forumsRouter);
    const user = await prisma.user.create({
      data: { name: 'User', email: 'user@example.com', password: 'hashed-password', role: 'listener' }
    });
    const token = jwt.sign({ userId: user.id }, 'test-secret');

    const createRes = await request(app, '/', {
      method: 'POST',
      body: { title: 'Test Post', content: 'Test Content' },
      cookie: `token=${token}`
    });
    expect(createRes.response.status).toBe(201);
    expect(createRes.payload.message).toBe('Forum post created successfully');

    const listRes = await request(app, '/', {
      cookie: `token=${token}`
    });
    expect(listRes.response.status).toBe(200);
    expect(listRes.payload.length).toBe(1);

    const postId = createRes.payload.post.id;
    const commentsRes = await request(app, `/${postId}/comments`, {
      cookie: `token=${token}`
    });
    expect(commentsRes.response.status).toBe(200);
    expect(commentsRes.payload.length).toBe(0);
  });
});
