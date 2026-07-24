import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const translationsRouter = (await import('../modules/translations/translations.routes.js')).default;

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

describe('translations routes catch-block coverage', () => {
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
    const app = createApp(translationsRouter);
    const token = jwt.sign({ userId: null }, 'test-secret');

    const res = await request(app, '/', {
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(401);
    expect(res.payload.error).toBe('User must be authenticated');
  });

  it('returns service error when GET /:id is called for a non-existent translation', async () => {
    const app = createApp(translationsRouter);
    const user = await prisma.user.create({
      data: { name: 'User', email: 'user@example.com', password: 'hashed-password', role: 'imam' }
    });
    const token = jwt.sign({ userId: user.id }, 'test-secret');

    const res = await request(app, '/999999', {
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(404);
    expect(res.payload.error).toBe('Translation not found');
  });

  it('returns service error when POST / is called with missing fields', async () => {
    const app = createApp(translationsRouter);
    const user = await prisma.user.create({
      data: { name: 'User', email: 'user@example.com', password: 'hashed-password', role: 'imam' }
    });
    const token = jwt.sign({ userId: user.id }, 'test-secret');

    const res = await request(app, '/', {
      method: 'POST',
      body: { sessionId: '1' },
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(400);
    expect(res.payload.error).toBe('Missing required fields');
  });

  it('returns service error when PUT /:id targets a non-existent translation', async () => {
    const app = createApp(translationsRouter);
    const user = await prisma.user.create({
      data: { name: 'User', email: 'user@example.com', password: 'hashed-password', role: 'imam' }
    });
    const session = await prisma.session.create({
      data: { imamId: user.id, title: 'Sermon', description: 'Desc' }
    });
    const token = jwt.sign({ userId: user.id }, 'test-secret');

    const res = await request(app, '/999999', {
      method: 'PUT',
      body: {
        sessionId: String(session.id),
        originalText: 'Hello',
        translatedText: 'Hallo',
        language: 'de'
      },
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(404);
    expect(res.payload.error).toBe('Translation not found');
  });

  it('returns service error when DELETE /:id targets a non-existent translation', async () => {
    const app = createApp(translationsRouter);
    const user = await prisma.user.create({
      data: { name: 'User', email: 'user@example.com', password: 'hashed-password', role: 'imam' }
    });
    const token = jwt.sign({ userId: user.id }, 'test-secret');

    const res = await request(app, '/999999', {
      method: 'DELETE',
      cookie: `token=${token}`
    });

    expect(res.response.status).toBe(404);
    expect(res.payload.error).toBe('Translation not found');
  });
});
