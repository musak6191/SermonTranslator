import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

process.env.RESEND_API_KEY = 'test-key';

const prisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  translation: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  forumPost: {
    findMany: vi.fn(),
    create: vi.fn()
  },
  forumComment: {
    create: vi.fn(),
    findMany: vi.fn()
  },
  pushSubscription: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prisma)
}));

vi.mock('web-push', () => ({
  __esModule: true,
  default: {
    sendNotification: vi.fn().mockResolvedValue(undefined)
  },
  sendNotification: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: vi.fn().mockResolvedValue({}) } }))
}));

vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<div>Reset</div>')
}));

vi.mock('@react-email/components', () => ({
  Html: 'html',
  Body: 'body',
  Container: 'div',
  Text: 'span',
  Heading: 'h1',
  Button: 'a'
}));

vi.mock('../modules/common/auth.middleware.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = { userId: Number(req.headers['x-user-id'] || 1) };
    next();
  }
}));

const authServiceModule = await import('../modules/auth/auth.service.js');
const sessionServiceModule = await import('../modules/session/session.service.js');
const translationsServiceModule = await import('../modules/translations/translations.service.js');
const forumsServiceModule = await import('../modules/forums/forums.service.js');
const pushServiceModule = await import('../modules/push/push.service.js');
const usersServiceModule = await import('../modules/users/users.service.js');

const authRouter = (await import('../modules/auth/auth.routes.js')).default;
const sessionRouter = (await import('../modules/session/session.routes.js')).default;
const usersRouter = (await import('../modules/users/users.routes.js')).default;
const translationsRouter = (await import('../modules/translations/translations.routes.js')).default;
const forumsRouter = (await import('../modules/forums/forums.routes.js')).default;
const pushRouter = (await import('../modules/push/push.routes.js')).default;

const { registerUser, loginUser, getCurrentUserInfo, requestPasswordChange, resetPasswordWithToken } = authServiceModule;
const { createSession, getSession, joinSession, endSession } = sessionServiceModule;
const { getAllTranslations, getTranslation, createTranslation, replaceTranslation, deleteTranslation } = translationsServiceModule;
const { getAllForums, createForumPost, createComment, getSpecificComments } = forumsServiceModule;
const { savePushSubscription } = pushServiceModule;
const { createUser, getAllUser } = usersServiceModule;

function createApp(router) {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

async function request(app, path, options = {}) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
      ...(options.userId ? { 'x-user-id': String(options.userId) } : {})
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

describe('branch coverage suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.CLIENT_BASE_URL = 'http://localhost:5173';

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 1, name: 'User', email: 'user@example.com', role: 'listener' });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.update.mockResolvedValue({ id: 1, password: 'hash' });

    prisma.session.create.mockResolvedValue({ id: 10, imamId: 1, title: 'T', description: 'D', isActive: true });
    prisma.session.findUnique.mockResolvedValue(null);
    prisma.session.findMany.mockResolvedValue([]);
    prisma.session.update.mockResolvedValue({ id: 10, imamId: 1, title: 'T', description: 'D' });
    prisma.session.delete.mockResolvedValue({});

    prisma.translation.findMany.mockResolvedValue([]);
    prisma.translation.findUnique.mockResolvedValue(null);
    prisma.translation.create.mockResolvedValue({ id: 1, sessionId: 10, originalText: 'A', translatedText: 'B', language: 'fr' });
    prisma.translation.update.mockResolvedValue({ id: 1, sessionId: 10, originalText: 'A', translatedText: 'B', language: 'fr' });
    prisma.translation.delete.mockResolvedValue({});

    prisma.forumPost.findMany.mockResolvedValue([]);
    prisma.forumPost.create.mockResolvedValue({ id: 1, title: 'Title', content: 'Body', authorId: 1 });
    prisma.forumComment.create.mockResolvedValue({ id: 1, content: 'Nice', authorId: 1, postId: 1 });
    prisma.forumComment.findMany.mockResolvedValue([]);

    prisma.pushSubscription.findFirst.mockResolvedValue(null);
    prisma.pushSubscription.create.mockResolvedValue({ id: 1, endpoint: 'https://example.com', userId: 1 });
    prisma.pushSubscription.update.mockResolvedValue({ id: 1, endpoint: 'https://example.com', userId: 1 });
    prisma.pushSubscription.delete.mockResolvedValue({});
  });

  describe('auth service', () => {
    it('covers registration, login, profile, and password reset branches', async () => {
      await expect(registerUser({ name: '', email: 'x', password: 'abc', role: 'listener' }, 1)).rejects.toMatchObject({ status: 400 });
      await expect(registerUser({ name: 'A', email: 'x', password: 'abc', role: 'admin' }, 1)).rejects.toMatchObject({ status: 400 });
      await expect(registerUser({ name: 'A', email: 'x', password: 'weak', role: 'listener' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 2, email: 'dup@example.com' });
      await expect(registerUser({ name: 'A', email: 'dup@example.com', password: 'StrongP@ss1', role: 'listener' }, 1)).rejects.toMatchObject({ status: 409 });
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 2, name: 'A', email: 'new@example.com', role: 'imam', createdAt: new Date() });
      await expect(registerUser({ name: 'A', email: 'new@example.com', password: 'StrongP@ss1', role: 'imam' }, 1)).resolves.toMatchObject({ email: 'new@example.com' });

      await expect(loginUser({ email: '', password: 'a' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 3, password: await bcrypt.hash('StrongP@ss1', 10) });
      await expect(loginUser({ email: 'ok@example.com', password: 'wrong' }, 1)).rejects.toMatchObject({ status: 401 });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 3, password: await bcrypt.hash('StrongP@ss1', 10), email: 'ok@example.com' });
      await expect(loginUser({ email: 'ok@example.com', password: 'StrongP@ss1' }, 1)).resolves.toMatchObject({ email: 'ok@example.com' });

      await expect(getCurrentUserInfo({}, undefined)).rejects.toMatchObject({ status: 401 });
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(getCurrentUserInfo({}, 9)).rejects.toMatchObject({ status: 404 });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 9, name: 'Me', email: 'me@example.com', role: 'listener', createdAt: new Date() });
      await expect(getCurrentUserInfo({}, 9)).resolves.toMatchObject({ email: 'me@example.com' });

      await expect(requestPasswordChange({}, undefined)).rejects.toMatchObject({ status: 401 });
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(requestPasswordChange({}, 10)).rejects.toMatchObject({ status: 404 });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 10, password: 'hash', email: 'r@example.com' });
      await expect(requestPasswordChange({}, 10)).resolves.toMatchObject({ email: 'r@example.com' });

      await expect(resetPasswordWithToken({ token: '', newPassword: 'StrongP@ss1' }, 1)).rejects.toMatchObject({ status: 400 });
      await expect(resetPasswordWithToken({ token: 'badtoken', newPassword: 'StrongP@ss1' }, 1)).rejects.toMatchObject({ status: 400 });
      const signed = jwt.sign({ userId: 7 }, 'wrong-secret' + 'hash', { expiresIn: '15m' });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 7, password: 'hash' });
      await expect(resetPasswordWithToken({ token: signed, newPassword: 'StrongP@ss1' }, 1)).rejects.toMatchObject({ status: 400 });
      const validToken = jwt.sign({ userId: 7 }, 'test-secret' + 'hash', { expiresIn: '15m' });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 7, password: 'hash' });
      await expect(resetPasswordWithToken({ token: validToken, newPassword: 'weak' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 7, password: 'hash' });
      prisma.user.update.mockResolvedValueOnce({ id: 7 });
      await expect(resetPasswordWithToken({ token: validToken, newPassword: 'StrongP@ss1' }, 1)).resolves.toMatchObject({ message: 'Password updated successfully' });
    });
  });

  describe('session service', () => {
    it('covers session creation, access, join, and end branches', async () => {
      await expect(createSession({ title: '', description: 'x' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, role: 'listener' });
      await expect(createSession({ title: 'T', description: 'D' }, 1)).rejects.toMatchObject({ status: 403 });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, role: 'imam' });
      prisma.session.create.mockResolvedValueOnce({ id: 20, imamId: 1, title: 'T', description: 'D', imam: {}, participants: [], translations: [] });
      await expect(createSession({ title: ' T ', description: ' D ' }, 1)).resolves.toMatchObject({ id: 20 });

      await expect(getSession({ id: 'bad' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.session.findUnique.mockResolvedValueOnce(null);
      await expect(getSession({ id: '1' }, 1)).rejects.toMatchObject({ status: 404 });
      prisma.session.findUnique.mockResolvedValueOnce({ id: 1, imamId: 2, participants: [{ id: 3 }], translations: [] });
      await expect(getSession({ id: '1' }, 1)).rejects.toMatchObject({ status: 403 });
      prisma.session.findUnique.mockResolvedValueOnce({ id: 1, imamId: 1, participants: [], translations: [] });
      await expect(getSession({ id: '1' }, 1)).resolves.toMatchObject({ id: 1 });

      await expect(joinSession({ id: 'bad' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.session.findUnique.mockResolvedValueOnce(null);
      await expect(joinSession({ id: '1' }, 1)).rejects.toMatchObject({ status: 404 });
      prisma.session.findUnique.mockResolvedValueOnce({ id: 1 });
      prisma.session.update.mockResolvedValueOnce({});
      await expect(joinSession({ id: '1' }, 1)).resolves.toMatchObject({ message: 'Joined session' });

      await expect(endSession({ id: 'bad' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.session.findUnique.mockResolvedValueOnce(null);
      await expect(endSession({ id: '1' }, 1)).rejects.toMatchObject({ status: 404 });
      prisma.session.findUnique.mockResolvedValueOnce({ id: 1, imamId: 2, translations: [], participants: [] });
      await expect(endSession({ id: '1' }, 1)).rejects.toMatchObject({ status: 403 });
      prisma.session.findUnique.mockResolvedValueOnce({ id: 1, imamId: 1, translations: [], participants: [] });
      await expect(endSession({ id: '1' }, 1)).resolves.toMatchObject({ message: 'Session ended successfully' });
      prisma.session.findUnique.mockResolvedValueOnce({ id: 1, imamId: 1, translations: [{ id: 1 }], participants: [{ id: 2, pushSubscriptions: [] }] });
      prisma.session.update.mockResolvedValueOnce({});
      await expect(endSession({ id: '1' }, 1)).resolves.toMatchObject({ message: 'Session ended successfully' });
    });
  });

  describe('translations service', () => {
    it('covers translation CRUD branches', async () => {
      await expect(getAllTranslations({}, undefined)).rejects.toMatchObject({ status: 401 });
      await expect(getAllTranslations({}, 1)).resolves.toEqual([]);
      await expect(getTranslation({ id: '' }, 1)).rejects.toMatchObject({ status: 400 });
      await expect(getTranslation({ id: 'abc' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.translation.findUnique.mockResolvedValueOnce(null);
      await expect(getTranslation({ id: '1' }, 1)).rejects.toMatchObject({ status: 404 });
      prisma.translation.findUnique.mockResolvedValueOnce({ id: 1, session: {} });
      await expect(getTranslation({ id: '1' }, 1)).resolves.toMatchObject({ id: 1 });

      await expect(createTranslation({ sessionId: '', originalText: 'a', translatedText: 'b', language: 'fr' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.session.findUnique.mockResolvedValueOnce(null);
      await expect(createTranslation({ sessionId: '1', originalText: 'a', translatedText: 'b', language: 'fr' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.session.findUnique.mockResolvedValueOnce({ id: 1, imamId: 2 });
      await expect(createTranslation({ sessionId: '1', originalText: 'a', translatedText: 'b', language: 'fr' }, 1)).rejects.toMatchObject({ status: 403 });
      prisma.session.findUnique.mockResolvedValueOnce({ id: 1, imamId: 1 });
      prisma.translation.create.mockResolvedValueOnce({ id: 2, session: {} });
      await expect(createTranslation({ sessionId: '1', originalText: 'a', translatedText: 'b', language: 'fr' }, 1)).resolves.toMatchObject({ id: 2 });

      await expect(replaceTranslation({ id: '', sessionId: '1', originalText: 'a', translatedText: 'b', language: 'fr' }, 1)).rejects.toMatchObject({ status: 400 });
      await expect(replaceTranslation({ id: 'abc', sessionId: '1', originalText: 'a', translatedText: 'b', language: 'fr' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.translation.findUnique.mockResolvedValueOnce(null);
      await expect(replaceTranslation({ id: '1', sessionId: '1', originalText: 'a', translatedText: 'b', language: 'fr' }, 1)).rejects.toMatchObject({ status: 404 });
      prisma.translation.findUnique.mockResolvedValueOnce({ id: 1, session: {} });
      prisma.session.findUnique.mockResolvedValueOnce(null);
      await expect(replaceTranslation({ id: '1', sessionId: '1', originalText: 'a', translatedText: 'b', language: 'fr' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.session.findUnique.mockResolvedValueOnce({ id: 1, imamId: 2 });
      await expect(replaceTranslation({ id: '1', sessionId: '1', originalText: 'a', translatedText: 'b', language: 'fr' }, 1)).rejects.toMatchObject({ status: 403 });
      prisma.translation.findUnique.mockResolvedValueOnce({ id: 1, session: {} });
      prisma.session.findUnique.mockResolvedValueOnce({ id: 1, imamId: 1 });
      prisma.translation.update.mockResolvedValueOnce({ id: 1, session: {} });
      await expect(replaceTranslation({ id: '1', sessionId: '1', originalText: 'a', translatedText: 'b', language: 'fr' }, 1)).resolves.toMatchObject({ id: 1 });

      await expect(deleteTranslation({ id: '' }, 1)).rejects.toMatchObject({ status: 400 });
      await expect(deleteTranslation({ id: 'abc' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.translation.findUnique.mockResolvedValueOnce(null);
      await expect(deleteTranslation({ id: '1' }, 1)).rejects.toMatchObject({ status: 404 });
      prisma.translation.findUnique.mockResolvedValueOnce({ id: 1, session: { imamId: 2 } });
      await expect(deleteTranslation({ id: '1' }, 1)).rejects.toMatchObject({ status: 403 });
      prisma.translation.findUnique.mockResolvedValueOnce({ id: 1, session: { imamId: 1 } });
      await expect(deleteTranslation({ id: '1' }, 1)).resolves.toBeUndefined();
    });
  });

  describe('forums and push services', () => {
    it('covers forums, comments, and subscriptions', async () => {
      await expect(getAllForums({}, undefined)).rejects.toMatchObject({ status: 401 });
      await expect(getAllForums({}, 1)).resolves.toEqual([]);
      await expect(createForumPost({ title: '', content: 'x' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.forumPost.create.mockResolvedValueOnce({ id: 7, title: 'T', content: 'C', author: {} });
      await expect(createForumPost({ title: 'T', content: 'C' }, 1)).resolves.toMatchObject({ id: 7 });
      await expect(createComment({ id: 'x', content: 'hi' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.forumComment.create.mockResolvedValueOnce({ id: 3, content: 'hi', author: {} });
      await expect(createComment({ id: '2', content: 'hi' }, 1)).resolves.toMatchObject({ id: 3 });
      await expect(getSpecificComments({ id: '' }, 1)).rejects.toMatchObject({ status: 400 });
      await expect(getSpecificComments({ id: 'x' }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.forumComment.findMany.mockResolvedValueOnce([{ id: 1, content: 'hi' }]);
      await expect(getSpecificComments({ id: '2' }, 1)).resolves.toHaveLength(1);

      await expect(savePushSubscription({ endpoint: 'https://example.com', keys: { p256dh: 'a', auth: 'b' } }, undefined)).rejects.toMatchObject({ status: 401 });
      await expect(savePushSubscription({ endpoint: '', keys: { p256dh: 'a', auth: 'b' } }, 1)).rejects.toMatchObject({ status: 400 });
      prisma.pushSubscription.findFirst.mockResolvedValueOnce({ id: 4 });
      prisma.pushSubscription.update.mockResolvedValueOnce({ id: 4 });
      await expect(savePushSubscription({ endpoint: 'https://example.com', keys: { p256dh: 'a', auth: 'b' } }, 1)).resolves.toMatchObject({ id: 4 });
      prisma.pushSubscription.findFirst.mockResolvedValueOnce(null);
      prisma.pushSubscription.create.mockResolvedValueOnce({ id: 5 });
      await expect(savePushSubscription({ endpoint: 'https://example.com/2', keys: { p256dh: 'a', auth: 'b' } }, 1)).resolves.toMatchObject({ id: 5 });
    });
  });

  describe('routes', () => {
    it('covers auth, session, users, translations, forums, and push routes', async () => {
      const authApp = createApp(authRouter);
      const sessionApp = createApp(sessionRouter);
      const usersApp = createApp(usersRouter);
      const translationsApp = createApp(translationsRouter);
      const forumsApp = createApp(forumsRouter);
      const pushApp = createApp(pushRouter);

      const registerRes = await request(authApp, '/register', { method: 'POST', body: { name: 'A', email: 'a@example.com', password: 'StrongP@ss1', role: 'listener' } });
      expect(registerRes.response.status).toBe(201);
      const loginRes = await request(authApp, '/login', { method: 'POST', body: { email: 'a@example.com', password: 'StrongP@ss1' } });
      expect(loginRes.response.status).toBe(200);
      const logoutRes = await request(authApp, '/logout', { method: 'POST' });
      expect(logoutRes.response.status).toBe(200);
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, name: 'A', email: 'a@example.com', role: 'listener', createdAt: new Date() });
      const meRes = await request(authApp, '/me', { method: 'GET' });
      expect(meRes.response.status).toBe(200);
      const resetReqRes = await request(authApp, '/request-password-change', { method: 'POST' });
      expect(resetReqRes.response.status).toBe(200);
      const resetRes = await request(authApp, '/reset-password-with-token', { method: 'POST', body: { token: jwt.sign({ userId: 1 }, process.env.JWT_SECRET + 'hash', { expiresIn: '15m' }), newPassword: 'StrongP@ss1' } });
      expect(resetRes.response.status).toBe(200);

      prisma.session.create.mockResolvedValueOnce({ id: 77, imamId: 1, title: 'T', description: 'D', imam: {}, participants: [], translations: [] });
      const sessionCreateRes = await request(sessionApp, '/', { method: 'POST', body: { title: 'T', description: 'D' }, userId: 1 });
      expect(sessionCreateRes.response.status).toBe(201);
      prisma.session.findMany.mockResolvedValueOnce([{ id: 77, imamId: 1 }]);
      const sessionListRes = await request(sessionApp, '/', { method: 'GET', userId: 1 });
      expect(sessionListRes.response.status).toBe(200);
      prisma.session.findUnique.mockResolvedValueOnce({ id: 77, imamId: 1, participants: [] });
      const sessionJoinRes = await request(sessionApp, '/77/join', { method: 'POST', userId: 2 });
      expect(sessionJoinRes.response.status).toBe(200);
      prisma.session.findUnique.mockResolvedValueOnce({ id: 77, imamId: 1, translations: [], participants: [] });
      const sessionEndRes = await request(sessionApp, '/77/end', { method: 'POST', userId: 1 });
      expect(sessionEndRes.response.status).toBe(200);
      prisma.session.findUnique.mockResolvedValueOnce({ id: 77, imamId: 1, participants: [], translations: [] });
      const sessionGetRes = await request(sessionApp, '/77', { method: 'GET', userId: 1 });
      expect(sessionGetRes.response.status).toBe(200);

      prisma.user.create.mockResolvedValueOnce({ id: 2, name: 'Route', role: 'listener' });
      const userCreateRes = await request(usersApp, '/', { method: 'POST', body: { name: 'Route', role: 'listener' }, userId: 1 });
      expect(userCreateRes.response.status).toBe(201);
      const userListRes = await request(usersApp, '/', { method: 'GET', userId: 1 });
      expect(userListRes.response.status).toBe(200);

      prisma.translation.create.mockResolvedValueOnce({ id: 9, sessionId: 77, originalText: 'A', translatedText: 'B', language: 'fr', session: {} });
      const translationCreateRes = await request(translationsApp, '/', { method: 'POST', body: { sessionId: 77, originalText: 'A', translatedText: 'B', language: 'fr' }, userId: 1 });
      expect(translationCreateRes.response.status).toBe(201);
      prisma.translation.findMany.mockResolvedValueOnce([{ id: 9, session: {} }]);
      const translationListRes = await request(translationsApp, '/', { method: 'GET', userId: 1 });
      expect(translationListRes.response.status).toBe(200);
      prisma.translation.findUnique.mockResolvedValueOnce({ id: 9, session: {} });
      const translationGetRes = await request(translationsApp, '/9', { method: 'GET', userId: 1 });
      expect(translationGetRes.response.status).toBe(200);
      prisma.translation.update.mockResolvedValueOnce({ id: 9, session: {} });
      const translationPutRes = await request(translationsApp, '/9', { method: 'PUT', body: { sessionId: 77, originalText: 'A', translatedText: 'B', language: 'fr' }, userId: 1 });
      expect(translationPutRes.response.status).toBe(200);
      prisma.translation.delete.mockResolvedValueOnce({});
      const translationDeleteRes = await request(translationsApp, '/9', { method: 'DELETE', userId: 1 });
      expect(translationDeleteRes.response.status).toBe(204);

      prisma.forumPost.findMany.mockResolvedValueOnce([{ id: 1, title: 'T', content: 'C', author: {} }]);
      const forumListRes = await request(forumsApp, '/', { method: 'GET', userId: 1 });
      expect(forumListRes.response.status).toBe(200);
      prisma.forumPost.create.mockResolvedValueOnce({ id: 2, title: 'T', content: 'C', author: {} });
      const forumCreateRes = await request(forumsApp, '/', { method: 'POST', body: { title: 'T', content: 'C' }, userId: 1 });
      expect(forumCreateRes.response.status).toBe(201);
      prisma.forumComment.findMany.mockResolvedValueOnce([{ id: 1, content: 'Nice', author: {} }]);
      const commentsRes = await request(forumsApp, '/2/comments', { method: 'GET', userId: 1 });
      expect(commentsRes.response.status).toBe(200);
      prisma.forumComment.create.mockResolvedValueOnce({ id: 2, content: 'Nice', author: {} });
      const commentCreateRes = await request(forumsApp, '/2/comments', { method: 'POST', body: { content: 'Nice' }, userId: 1 });
      expect(commentCreateRes.response.status).toBe(201);

      const pushRes = await request(pushApp, '/subscribe', { method: 'POST', body: { endpoint: 'https://example.com', keys: { p256dh: 'a', auth: 'b' } }, userId: 1 });
      expect(pushRes.response.status).toBe(201);
    });
  });
});
