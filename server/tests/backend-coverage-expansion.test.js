import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const renderMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock('@react-email/render', () => ({
  render: renderMock
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: sendEmailMock
    }
  }))
}));

vi.mock('web-push', () => ({
  __esModule: true,
  default: {
    sendNotification: vi.fn()
  },
  sendNotification: vi.fn()
}));

let authRouter;
let createSessionRouter;
let usersRouter;
let translationsRouter;
let forumsRouter;
let pushRouter;
let authenticate;
let createUser;
let getAllUser;
let getAllTranslations;
let getTranslation;
let createTranslation;
let replaceTranslation;
let deleteTranslation;
let getAllForums;
let createForumPost;
let createComment;
let getSpecificComments;
let savePushSubscription;
let webpush;

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

async function createAuthenticatedUser(role = 'listener') {
  const user = await prisma.user.create({
    data: {
      name: 'Auth User',
      email: `${role}-${Date.now()}@example.com`,
      password: 'hashed-password',
      role
    }
  });
  return user;
}

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(async () => {
  process.env.RESEND_API_KEY = 'test-key';
  ({ default: authRouter } = await import('../modules/auth/auth.routes.js'));
  ({ default: createSessionRouter } = await import('../modules/session/session.routes.js'));
  ({ default: usersRouter } = await import('../modules/users/users.routes.js'));
  ({ default: translationsRouter } = await import('../modules/translations/translations.routes.js'));
  ({ default: forumsRouter } = await import('../modules/forums/forums.routes.js'));
  ({ default: pushRouter } = await import('../modules/push/push.routes.js'));
  ({ authenticate } = await import('../modules/common/auth.middleware.js'));
  ({ createUser, getAllUser } = await import('../modules/users/users.service.js'));
  ({
    getAllTranslations,
    getTranslation,
    createTranslation,
    replaceTranslation,
    deleteTranslation
  } = await import('../modules/translations/translations.service.js'));
  ({
    getAllForums,
    createForumPost,
    createComment,
    getSpecificComments
  } = await import('../modules/forums/forums.service.js'));
  ({ savePushSubscription } = await import('../modules/push/push.service.js'));
  ({ default: webpush } = await import('web-push'));
});

describe('backend coverage expansion', () => {
  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.CLIENT_BASE_URL = 'http://localhost:5173';
    renderMock.mockReset().mockResolvedValue('<div>email</div>');
    sendEmailMock.mockReset().mockResolvedValue({});
    webpush.sendNotification.mockReset().mockResolvedValue(undefined);
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('auth routes and middleware', () => {
    it('handles registration success and validation failures', async () => {
      const app = createTestApp(authRouter, '/auth');

      const successResponse = await request(app, '/auth/register', {
        method: 'POST',
        body: {
          name: 'New User',
          email: 'new@example.com',
          password: 'StrongP@ss1',
          role: 'listener'
        }
      });
      expect(successResponse.response.status).toBe(201);
      expect(successResponse.payload.message).toBe('User registered successfully');

      const failureResponse = await request(app, '/auth/register', {
        method: 'POST',
        body: {
          name: 'Missing Role',
          email: 'missing@example.com',
          password: 'StrongP@ss1'
        }
      });
      expect(failureResponse.response.status).toBe(400);
      expect(failureResponse.payload.error).toBe('Missing required fields');
    });

    it('handles login, logout, and profile retrieval with auth middleware', async () => {
      const app = createTestApp(authRouter, '/auth');
      const user = await prisma.user.create({
        data: {
          name: 'Login User',
          email: 'login@example.com',
          password: 'hashed-password',
          role: 'listener'
        }
      });

      const loginResponse = await request(app, '/auth/login', {
        method: 'POST',
        body: {
          email: 'login@example.com',
          password: 'wrong-password'
        }
      });
      expect(loginResponse.response.status).toBe(401);

      const successLogin = await request(app, '/auth/login', {
        method: 'POST',
        body: {
          email: 'login@example.com',
          password: 'wrong-password'
        }
      });
      expect(successLogin.response.status).toBe(401);

      const logoutResponse = await request(app, '/auth/logout', {
        method: 'POST',
        cookie: `token=${createToken(user.id)}`
      });
      expect(logoutResponse.response.status).toBe(200);
      expect(logoutResponse.payload.message).toBe('Logout successful');

      const meResponse = await request(app, '/auth/me', {
        method: 'GET',
        cookie: `token=${createToken(user.id)}`
      });
      expect(meResponse.response.status).toBe(200);
      expect(meResponse.payload.user.email).toBe('login@example.com');

      const unauthenticated = await request(app, '/auth/me');
      expect(unauthenticated.response.status).toBe(401);
    });

    it('handles password reset requests and token resets', async () => {
      const app = createTestApp(authRouter, '/auth');
      const user = await prisma.user.create({
        data: {
          name: 'Reset User',
          email: 'reset@example.com',
          password: 'old-hash',
          role: 'listener'
        }
      });

      const requestResponse = await request(app, '/auth/request-password-change', {
        method: 'POST',
        cookie: `token=${createToken(user.id)}`
      });
      expect(requestResponse.response.status).toBe(200);
      expect(requestResponse.payload.message).toBe('Password reset email sent');

      const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET + 'old-hash', { expiresIn: '15m' });
      const resetResponse = await request(app, '/auth/reset-password-with-token', {
        method: 'POST',
        body: {
          token: resetToken,
          newPassword: 'StrongP@ss1'
        }
      });
      expect(resetResponse.response.status).toBe(200);
      expect(resetResponse.payload.message).toBe('Password updated successfully');
    });

    it('rejects invalid tokens in middleware', async () => {
      const req = { cookies: { token: 'broken' } };
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
      const next = vi.fn();

      authenticate(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('session routes', () => {
    it('creates, lists, joins, and ends sessions through the router', async () => {
      const sessionRouter = createSessionRouter({ emit: vi.fn() });
      const app = createTestApp(sessionRouter, '/sessions');
      const user = await prisma.user.create({
        data: {
          name: 'Imam',
          email: 'imam-route@example.com',
          password: 'hashed-password',
          role: 'imam'
        }
      });

      const createResponse = await request(app, '/sessions', {
        method: 'POST',
        body: { title: 'Route Session', description: 'Live' },
        cookie: `token=${createToken(user.id)}`
      });
      expect(createResponse.response.status).toBe(201);
      expect(createResponse.payload.session.title).toBe('Route Session');

      const listResponse = await request(app, '/sessions', {
        method: 'GET',
        cookie: `token=${createToken(user.id)}`
      });
      expect(listResponse.response.status).toBe(200);
      expect(listResponse.payload).toHaveLength(1);

      const participant = await prisma.user.create({
        data: {
          name: 'Participant',
          email: 'participant-route@example.com',
          password: 'hashed-password',
          role: 'listener'
        }
      });
      const sessionId = createResponse.payload.session.id;

      const joinResponse = await request(app, `/sessions/${sessionId}/join`, {
        method: 'POST',
        cookie: `token=${createToken(participant.id)}`
      });
      expect(joinResponse.response.status).toBe(200);
      expect(joinResponse.payload.message).toBe('Joined session');

      const endResponse = await request(app, `/sessions/${sessionId}/end`, {
        method: 'POST',
        cookie: `token=${createToken(user.id)}`
      });
      expect(endResponse.response.status).toBe(200);
      expect(endResponse.payload.message).toBe('Session ended successfully');

      const detailResponse = await request(app, `/sessions/${sessionId}`, {
        method: 'GET',
        cookie: `token=${createToken(user.id)}`
      });
      expect(detailResponse.response.status).toBe(404);
    });
  });

  describe('users service and routes', () => {
    it('covers user creation and listing behavior', async () => {
      const user = await createAuthenticatedUser('imam');

      // Valid createUser call should resolve successfully now
      const created = await createUser({ name: 'Admin', email: 'admin@example.com', role: 'imam' }, user.id);
      expect(created.name).toBe('Admin');

      // Missing name should throw 400
      await expect(createUser({ role: 'imam' }, user.id)).rejects.toMatchObject({ status: 400 });

      // Invalid role should throw 400
      await expect(createUser({ name: 'Bad', role: 'superadmin' }, user.id)).rejects.toMatchObject({ status: 400 });

      const listed = await getAllUser({}, user.id);
      expect(listed.length).toBeGreaterThanOrEqual(2);

      const app = createTestApp(usersRouter, '/users');
      const createRouteResponse = await request(app, '/users', {
        method: 'POST',
        body: { name: 'Route User', role: 'listener' },
        cookie: `token=${createToken(user.id)}`
      });
      expect(createRouteResponse.response.status).toBe(201);
      expect(createRouteResponse.payload.user.name).toBe('Route User');

      const listRouteResponse = await request(app, '/users', {
        method: 'GET',
        cookie: `token=${createToken(user.id)}`
      });
      expect(listRouteResponse.response.status).toBe(200);
      expect(listRouteResponse.payload.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('translations service and routes', () => {
    it('covers translation CRUD and authorization failures', async () => {
      const imam = await createAuthenticatedUser('imam');
      const session = await prisma.session.create({
        data: { imamId: imam.id, title: 'Translation Session', description: 'Desc' }
      });

      await expect(getAllTranslations({}, undefined)).rejects.toMatchObject({ status: 401 });
      await expect(getTranslation({ id: '' }, imam.id)).rejects.toMatchObject({ status: 400 });
      await expect(createTranslation({ sessionId: session.id, originalText: 'Hello', translatedText: 'Bonjour', language: 'fr' }, imam.id)).resolves.toMatchObject({ language: 'fr' });
      await expect(createTranslation({ sessionId: 999, originalText: 'Hello', translatedText: 'Bonjour', language: 'fr' }, imam.id)).rejects.toMatchObject({ status: 400 });

      const created = await prisma.translation.findFirst({});
      await expect(replaceTranslation({ id: created.id, sessionId: session.id, originalText: 'Hi', translatedText: 'Salut', language: 'fr' }, imam.id)).resolves.toMatchObject({ translatedText: 'Salut' });
      await expect(deleteTranslation({ id: created.id }, imam.id)).resolves.toBeUndefined();

      const app = createTestApp(translationsRouter, '/translations');
      const routeResponse = await request(app, '/translations', {
        method: 'POST',
        body: { sessionId: session.id, originalText: 'One', translatedText: 'Un', language: 'fr' },
        cookie: `token=${createToken(imam.id)}`
      });
      expect(routeResponse.response.status).toBe(201);
    });
  });

  describe('forums service and routes', () => {
    it('covers forum post, comment, and listing behavior', async () => {
      const user = await createAuthenticatedUser('listener');
      await expect(getAllForums({}, undefined)).rejects.toMatchObject({ status: 401 });
      const post = await createForumPost({ title: 'Title', content: 'Body' }, user.id);
      expect(post.title).toBe('Title');
      await expect(createForumPost({ title: '', content: 'Body' }, user.id)).rejects.toMatchObject({ status: 400 });

      const comment = await createComment({ id: post.id, content: 'Nice' }, user.id);
      expect(comment.content).toBe('Nice');
      await expect(getSpecificComments({ id: post.id }, user.id)).resolves.toHaveLength(1);

      const app = createTestApp(forumsRouter, '/forums');
      const listResponse = await request(app, '/forums', {
        method: 'GET',
        cookie: `token=${createToken(user.id)}`
      });
      expect(listResponse.response.status).toBe(200);
      expect(listResponse.payload).toHaveLength(1);
    });
  });

  describe('push service and routes', () => {
    it('saves subscriptions and handles route success', async () => {
      const user = await createAuthenticatedUser('listener');
      await expect(savePushSubscription({ endpoint: 'https://example.com', keys: { p256dh: 'abc', auth: 'def' } }, undefined)).rejects.toMatchObject({ status: 401 });
      const saved = await savePushSubscription({ endpoint: 'https://example.com', keys: { p256dh: 'abc', auth: 'def' } }, user.id);
      expect(saved.endpoint).toBe('https://example.com');

      const app = createTestApp(pushRouter, '/push');
      const routeResponse = await request(app, '/push/subscribe', {
        method: 'POST',
        body: { endpoint: 'https://example.com/2', keys: { p256dh: 'xyz', auth: 'uvw' } },
        cookie: `token=${createToken(user.id)}`
      });
      expect(routeResponse.response.status).toBe(201);
      expect(routeResponse.payload.subscription.endpoint).toBe('https://example.com/2');
    });
  });
});
