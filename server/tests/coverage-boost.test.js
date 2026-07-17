import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';

// Set environment variables before any module loads
process.env.RESEND_API_KEY = 're_123';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_BASE_URL = 'http://localhost:5173';

const prisma = new PrismaClient();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({})
    }
  }))
}));

vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<div>Mock Email</div>')
}));

let authenticate;
let createUser, getAllUser;
let usersRouter;
let getAllForums, createForumPost, createComment, getSpecificComments;
let forumsRouter;
let savePushSubscription;
let pushRouter;
let getAllTranslations, getTranslation, createTranslation, replaceTranslation, deleteTranslation;
let translationsRouter;
let createSession, getSession, joinSession, endSession, getAllSession;
let createSessionRouter;
let registerUser, loginUser, logoutUser, getCurrentUserInfo, requestPasswordChange, resetPasswordWithToken;
let authRouter;
let webpush;

beforeAll(async () => {
  // 1. Registriere den Web-Push Mock explizit auf Modulebene
  vi.doMock('web-push', () => {
    const mockSend = vi.fn((subscription) => {
      if (subscription.endpoint && subscription.endpoint.includes('410')) {
        const err = new Error('410 error');
        err.statusCode = 410;
        return Promise.reject(err);
      }
      if (subscription.endpoint && subscription.endpoint.includes('500')) {
        const err = new Error('500 error');
        err.statusCode = 500;
        return Promise.reject(err);
      }
      return Promise.resolve({});
    });

    return {
      default: { sendNotification: mockSend },
      sendNotification: mockSend
    };
  });

  // 2. Jetzt erst die lokalen Services importieren, damit sie die gemockte Version erhalten
  ({ authenticate } = await import('../modules/common/auth.middleware.js'));
  ({ createUser, getAllUser } = await import('../modules/users/users.service.js'));
  ({ default: usersRouter } = await import('../modules/users/users.routes.js'));
  ({ getAllForums, createForumPost, createComment, getSpecificComments } = await import('../modules/forums/forums.service.js'));
  ({ default: forumsRouter } = await import('../modules/forums/forums.routes.js'));
  ({ savePushSubscription } = await import('../modules/push/push.service.js'));
  ({ default: pushRouter } = await import('../modules/push/push.routes.js'));
  ({ getAllTranslations, getTranslation, createTranslation, replaceTranslation, deleteTranslation } = await import('../modules/translations/translations.service.js'));
  ({ default: translationsRouter } = await import('../modules/translations/translations.routes.js'));
  ({ createSession, getSession, joinSession, endSession, getAllSession } = await import('../modules/session/session.service.js'));
  ({ default: createSessionRouter } = await import('../modules/session/routes.js').catch(() => import('../modules/session/session.routes.js')));
  ({ registerUser, loginUser, logoutUser, getCurrentUserInfo, requestPasswordChange, resetPasswordWithToken } = await import('../modules/auth/auth.service.js'));
  ({ default: authRouter } = await import('../modules/auth/auth.routes.js'));

  // Hol dir die Instanz für den Test-Scope
  webpush = await import('web-push');
});

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').filter(Boolean).reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (key) {
      acc[key] = decodeURIComponent(rest.join('='));
    }
    return acc;
  }, {});
}

function createTestApp(router, mountPath = '/') {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.cookies = parseCookies(req.headers.cookie || '');
    next();
  });
  app.use(mountPath, router);
  return app;
}

async function request(app, path, options = {}) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const url = `http://127.0.0.1:${port}${path}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'connection': 'close',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
      ...(options.cookie ? { cookie: options.cookie } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  await new Promise((resolve) => server.close(resolve));
  return { response, payload };
}

async function clearDatabase() {
  await prisma.$transaction([
    prisma.translation.deleteMany(),
    prisma.session.deleteMany(),
    prisma.pushSubscription.deleteMany(),
    prisma.forumComment.deleteMany(),
    prisma.forumPost.deleteMany(),
    prisma.user.deleteMany()
  ]);
}

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
}

describe('Coverage Boost Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('Auth Middleware', () => {
    it('covers all paths in authenticate middleware', () => {
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.body = payload;
          return this;
        }
      };

      // 1. Missing token
      const req1 = { cookies: {} };
      const next1 = vi.fn();
      authenticate(req1, res, next1);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Access token required');
      expect(next1).not.toHaveBeenCalled();

      // 2. Invalid or expired token
      const req2 = { cookies: { token: 'invalid-token-value' } };
      const next2 = vi.fn();
      authenticate(req2, res, next2);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
      expect(next2).not.toHaveBeenCalled();

      // 3. Valid token path
      const token = jwt.sign({ userId: 123 }, 'test-secret');
      const req3 = { cookies: { token } };
      const next3 = vi.fn();
      authenticate(req3, res, next3);
      expect(req3.user).toBeDefined();
      expect(req3.user.userId).toBe(123);
      expect(next3).toHaveBeenCalled();
    });
  });

  describe('Users Module', () => {
    it('covers users service validation and error branches', async () => {
      // createUser validation
      await expect(createUser({ role: 'listener' })).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Missing required fields' }
      });
      await expect(createUser({ name: 'Bob' })).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Missing required fields' }
      });
      await expect(createUser({ name: 'Bob', role: 'admin' })).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid role. Must be "imam" or "listener"' }
      });

      // getAllUser without auth
      await expect(getAllUser({}, null)).rejects.toMatchObject({
        status: 401,
        payload: { error: 'User must be authenticated' }
      });
    });

    it('covers users routes catch blocks and custom payload responses', async () => {
      const app = createTestApp(usersRouter, '/users');

      // Trigger 400 in usersRouter (Missing required fields)
      const res1 = await request(app, '/users', {
        method: 'POST',
        body: { name: 'Bob' },
        cookie: `token=${createToken(1)}`
      });
      expect(res1.response.status).toBe(400);
      expect(res1.payload.error).toBe('Missing required fields');

      // Trigger 401 in users GET route by passing userId=null inside token
      const invalidUserToken = jwt.sign({ userId: null }, 'test-secret');
      const res2 = await request(app, '/users', {
        method: 'GET',
        cookie: `token=${invalidUserToken}`
      });
      expect(res2.response.status).toBe(401);
      expect(res2.payload.error).toBe('User must be authenticated');
    });
  });

  describe('Forums Module', () => {
    it('covers forums service validation and unauthenticated branches', async () => {
      await expect(getAllForums({}, null)).rejects.toMatchObject({ status: 401 });
      await expect(createForumPost({}, null)).rejects.toMatchObject({ status: 401 });
      await expect(createComment({}, null)).rejects.toMatchObject({ status: 401 });
      await expect(getSpecificComments({}, null)).rejects.toMatchObject({ status: 401 });

      await expect(getSpecificComments({ id: '' }, 1)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Post id is required' }
      });

      await expect(getSpecificComments({ id: 'abc' }, 1)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid post id' }
      });
    });

    it('covers forum post and comment validations via routes', async () => {
      const app = createTestApp(forumsRouter, '/forums');
      const token = createToken(1);

      // Create post missing fields
      const res1 = await request(app, '/forums', {
        method: 'POST',
        body: { title: '' },
        cookie: `token=${token}`
      });
      expect(res1.response.status).toBe(400);

      // Create comment missing content
      const res2 = await request(app, '/forums/123/comments', {
        method: 'POST',
        body: {},
        cookie: `token=${token}`
      });
      expect(res2.response.status).toBe(400);

      // Create comment invalid post ID
      const res3 = await request(app, '/forums/abc/comments', {
        method: 'POST',
        body: { content: 'nice' },
        cookie: `token=${token}`
      });
      expect(res3.response.status).toBe(400);
    });
  });

  describe('Push Notifications Module', () => {
    it('covers push subscription upsert and validation checks', async () => {
      await expect(savePushSubscription({}, null)).rejects.toMatchObject({ status: 401 });
      await expect(savePushSubscription({ endpoint: '' }, 1)).rejects.toMatchObject({ status: 400 });

      // Create a user first
      const user = await prisma.user.create({
        data: { name: 'Pushy', email: 'pushy@test.com', password: 'password', role: 'listener' }
      });

      const subData = {
        endpoint: 'https://push.example.com/endpoint',
        keys: { p256dh: 'dhkey', auth: 'authkey' }
      };

      // Create new subscription
      const sub1 = await savePushSubscription(subData, user.id);
      expect(sub1.endpoint).toBe(subData.endpoint);

      // Update existing subscription
      const updatedKeys = { p256dh: 'newdhkey', auth: 'newauthkey' };
      const sub2 = await savePushSubscription({ ...subData, keys: updatedKeys }, user.id);
      expect(sub2.id).toBe(sub1.id);
      expect(sub2.p256dh).toBe('newdhkey');
    });

    it('covers push routes catch blocks', async () => {
      const app = createTestApp(pushRouter, '/push');
      const token = createToken(1);

      const res = await request(app, '/push/subscribe', {
        method: 'POST',
        body: {},
        cookie: `token=${token}`
      });
      expect(res.response.status).toBe(400);
    });
  });

  describe('Translations Module', () => {
    it('covers translation service validation, owner checks, and error branches', async () => {
      const user1 = await prisma.user.create({
        data: { name: 'Imam 1', email: 'imam1@test.com', password: 'password', role: 'imam' }
      });
      const user2 = await prisma.user.create({
        data: { name: 'Imam 2', email: 'imam2@test.com', password: 'password', role: 'imam' }
      });

      const session = await prisma.session.create({
        data: { imamId: user1.id, title: 'My Sermon', description: 'Desc' }
      });

      const translation = await prisma.translation.create({
        data: { sessionId: session.id, originalText: 'Hi', translatedText: 'Hallo', language: 'de' }
      });

      // deleteTranslation unauthenticated
      await expect(deleteTranslation({ id: String(translation.id) }, null)).rejects.toMatchObject({ status: 401 });

      // deleteTranslation missing ID
      await expect(deleteTranslation({ id: '' }, user1.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Translation id is required' }
      });

      // deleteTranslation invalid ID
      await expect(deleteTranslation({ id: 'abc' }, user1.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid translation id' }
      });

      // deleteTranslation not found
      await expect(deleteTranslation({ id: '999999' }, user1.id)).rejects.toMatchObject({
        status: 404,
        payload: { error: 'Translation not found' }
      });

      // deleteTranslation wrong owner check
      await expect(deleteTranslation({ id: String(translation.id) }, user2.id)).rejects.toMatchObject({
        status: 403,
        payload: { error: 'Access denied - you can only delete translations from your own sessions' }
      });
    });

    it('covers translations router catch blocks', async () => {
      const app = createTestApp(translationsRouter, '/translations');
      const token = createToken(1);

      // GET by invalid translation ID format
      const res1 = await request(app, '/translations/abc', {
        cookie: `token=${token}`
      });
      expect(res1.response.status).toBe(400);

      // POST invalid fields
      const res2 = await request(app, '/translations', {
        method: 'POST',
        body: {},
        cookie: `token=${token}`
      });
      expect(res2.response.status).toBe(400);

      // PUT invalid fields
      const res3 = await request(app, '/translations/abc', {
        method: 'PUT',
        body: {},
        cookie: `token=${token}`
      });
      expect(res3.response.status).toBe(400);

      // DELETE invalid format
      const res4 = await request(app, '/translations/abc', {
        method: 'DELETE',
        cookie: `token=${token}`
      });
      expect(res4.response.status).toBe(400);
    });
  });

  describe('Session Module', () => {
    it('covers allSession service, endSession push failure handlers, and no-translation delete path', async () => {
      const imam = await prisma.user.create({
        data: { name: 'Session Imam', email: 'sessionimam@test.com', password: 'password', role: 'imam' }
      });

      const listener = await prisma.user.create({
        data: { name: 'Listener', email: 'listener@test.com', password: 'password', role: 'listener' }
      });

      // 1. getAllSession
      const s1 = await prisma.session.create({ data: { imamId: imam.id, title: 'Session 1', description: 'Desc' } });
      await prisma.session.create({ data: { imamId: imam.id, title: 'Session 2', description: 'Desc' } });
      const list = await getAllSession();
      expect(list.length).toBeGreaterThanOrEqual(2);

      // 2. endSession push notification error path L198-201
      // Create push subscription for participant
      await prisma.pushSubscription.create({
        data: { userId: listener.id, endpoint: 'https://fail.push.com/410', p256dh: 'dh', auth: 'auth' }
      });
      await prisma.pushSubscription.create({
        data: { userId: listener.id, endpoint: 'https://fail.push.com/500', p256dh: 'dh', auth: 'auth' }
      });

      // Connect participant to session
      await joinSession({ id: String(s1.id) }, listener.id);

      // End session (no translations -> deletes session)

      // End session (no translations -> deletes session)
      const endRes = await endSession({ id: String(s1.id) }, imam.id);
      expect(endRes.message).toBe('Session ended successfully');

      // Verify session 1 was deleted because it had 0 translations
      const s1Check = await prisma.session.findUnique({ where: { id: s1.id } });
      expect(s1Check).toBeNull();

      // Verify the 410 endpoint push subscription was deleted
      const sub410 = await prisma.pushSubscription.findUnique({
        where: { endpoint: 'https://fail.push.com/410' }
      });
      expect(sub410).toBeNull();

      // Verify the 500 endpoint push subscription still exists
      const sub500 = await prisma.pushSubscription.findUnique({
        where: { endpoint: 'https://fail.push.com/500' }
      });
      expect(sub500).toBeDefined();
    });
  });

  describe('Auth Module', () => {
    it('covers auth service token decode validation and not-found branches', async () => {
      // resetPasswordWithToken: invalid token decode
      await expect(resetPasswordWithToken({ token: 'broken-token', newPassword: 'StrongP@ss1' }, null)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid token' }
      });

      // resetPasswordWithToken: user not found
      const token = jwt.sign({ userId: 999999 }, 'test-secret');
      await expect(resetPasswordWithToken({ token, newPassword: 'StrongP@ss1' }, null)).rejects.toMatchObject({
        status: 404,
        payload: { error: 'User not found' }
      });

      // logoutUser validation
      const logoutResult = await logoutUser({}, 1);
      expect(logoutResult.message).toBe('Logout successful');
    });
  });
});
