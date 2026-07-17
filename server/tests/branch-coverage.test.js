import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';

process.env.RESEND_API_KEY = 'test-key';
const prisma = new PrismaClient();

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

let registerUser, loginUser, getCurrentUserInfo, requestPasswordChange, resetPasswordWithToken;
let createSession, getSession, joinSession, endSession;
let getAllTranslations, getTranslation, createTranslation, replaceTranslation, deleteTranslation;
let getAllForums, createForumPost, createComment, getSpecificComments;
let savePushSubscription;
let createUser, getAllUser;
let authRouter, sessionRouter, usersRouter, translationsRouter, forumsRouter, pushRouter;

beforeAll(async () => {
  const authServiceModule = await import('../modules/auth/auth.service.js');
  const sessionServiceModule = await import('../modules/session/session.service.js');
  const translationsServiceModule = await import('../modules/translations/translations.service.js');
  const forumsServiceModule = await import('../modules/forums/forums.service.js');
  const pushServiceModule = await import('../modules/push/push.service.js');
  const usersServiceModule = await import('../modules/users/users.service.js');

  ({ registerUser, loginUser, getCurrentUserInfo, requestPasswordChange, resetPasswordWithToken } = authServiceModule);
  ({ createSession, getSession, joinSession, endSession } = sessionServiceModule);
  ({ getAllTranslations, getTranslation, createTranslation, replaceTranslation, deleteTranslation } = translationsServiceModule);
  ({ getAllForums, createForumPost, createComment, getSpecificComments } = forumsServiceModule);
  ({ savePushSubscription } = pushServiceModule);
  ({ createUser, getAllUser } = usersServiceModule);

  authRouter = (await import('../modules/auth/auth.routes.js')).default;
  sessionRouter = (await import('../modules/session/session.routes.js')).default;
  usersRouter = (await import('../modules/users/users.routes.js')).default;
  translationsRouter = (await import('../modules/translations/translations.routes.js')).default;
  forumsRouter = (await import('../modules/forums/forums.routes.js')).default;
  pushRouter = (await import('../modules/push/push.routes.js')).default;
});

function createApp(router) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
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
      'connection': 'close',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
      ...(options.cookie ? { 'cookie': options.cookie } : {}),
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

  describe('auth service', () => {
    it('covers registration, login, profile, and password reset branches', async () => {
      // Input validations (rejections)
      await expect(registerUser({ name: '', email: 'x', password: 'abc', role: 'listener' }, 1)).rejects.toMatchObject({ status: 400 });
      await expect(registerUser({ name: 'A', email: 'x', password: 'abc', role: 'admin' }, 1)).rejects.toMatchObject({ status: 400 });
      await expect(registerUser({ name: 'A', email: 'x', password: 'weak', role: 'listener' }, 1)).rejects.toMatchObject({ status: 400 });

      // Duplicate registration
      await prisma.user.create({ data: { name: 'Existing', email: 'dup@example.com', password: 'hash', role: 'listener' } });
      await expect(registerUser({ name: 'A', email: 'dup@example.com', password: 'StrongP@ss1', role: 'listener' }, 1)).rejects.toMatchObject({ status: 409 });

      // Success registration
      await expect(registerUser({ name: 'A', email: 'new@example.com', password: 'StrongP@ss1', role: 'imam' }, 1)).resolves.toMatchObject({ email: 'new@example.com' });

      // Login validations
      await expect(loginUser({ email: '', password: 'a' }, 1)).rejects.toMatchObject({ status: 400 });
      const hash = await bcrypt.hash('StrongP@ss1', 10);
      await prisma.user.create({ data: { name: 'OK', email: 'ok@example.com', password: hash, role: 'listener' } });
      await expect(loginUser({ email: 'ok@example.com', password: 'wrong' }, 1)).rejects.toMatchObject({ status: 401 });
      await expect(loginUser({ email: 'ok@example.com', password: 'StrongP@ss1' }, 1)).resolves.toMatchObject({ email: 'ok@example.com' });

      // getCurrentUserInfo validations
      await expect(getCurrentUserInfo({}, undefined)).rejects.toMatchObject({ status: 401 });
      await expect(getCurrentUserInfo({}, 9999)).rejects.toMatchObject({ status: 404 });
      const meUser = await prisma.user.create({ data: { name: 'Me', email: 'me@example.com', password: 'hash', role: 'listener' } });
      await expect(getCurrentUserInfo({}, meUser.id)).resolves.toMatchObject({ email: 'me@example.com' });

      // requestPasswordChange validations
      await expect(requestPasswordChange({}, undefined)).rejects.toMatchObject({ status: 401 });
      await expect(requestPasswordChange({}, 9999)).rejects.toMatchObject({ status: 404 });
      const resetUser = await prisma.user.create({ data: { name: 'Reset', email: 'r@example.com', password: 'hash', role: 'listener' } });
      await expect(requestPasswordChange({}, resetUser.id)).resolves.toMatchObject({ email: 'r@example.com' });

      // resetPasswordWithToken validations
      await expect(resetPasswordWithToken({ token: '', newPassword: 'StrongP@ss1' }, 1)).rejects.toMatchObject({ status: 400 });
      await expect(resetPasswordWithToken({ token: 'badtoken', newPassword: 'StrongP@ss1' }, 1)).rejects.toMatchObject({ status: 400 });

      const signed = jwt.sign({ userId: resetUser.id }, 'wrong-secret' + resetUser.password, { expiresIn: '15m' });
      await expect(resetPasswordWithToken({ token: signed, newPassword: 'StrongP@ss1' }, 1)).rejects.toMatchObject({ status: 400 });

      const validToken = jwt.sign({ userId: resetUser.id }, 'test-secret' + resetUser.password, { expiresIn: '15m' });
      await expect(resetPasswordWithToken({ token: validToken, newPassword: 'weak' }, 1)).rejects.toMatchObject({ status: 400 });

      await expect(resetPasswordWithToken({ token: validToken, newPassword: 'StrongP@ss1' }, 1)).resolves.toMatchObject({ message: 'Password updated successfully' });
    });
  });

  describe('session service', () => {
    it('covers session creation, access, join, and end branches', async () => {
      // 1. Session creation
      await expect(createSession({ title: '', description: 'x' }, 1)).rejects.toMatchObject({ status: 400 });

      const listener = await prisma.user.create({ data: { name: 'Listener', email: 'listener@example.com', password: 'hash', role: 'listener' } });
      await expect(createSession({ title: 'T', description: 'D' }, listener.id)).rejects.toMatchObject({ status: 403 });

      const imam = await prisma.user.create({ data: { name: 'Imam', email: 'imam@example.com', password: 'hash', role: 'imam' } });
      const session = await createSession({ title: ' T ', description: ' D ' }, imam.id);
      expect(session).toMatchObject({ title: 'T', description: 'D' });

      // 2. Get session
      await expect(getSession({ id: 'bad' }, imam.id)).rejects.toMatchObject({ status: 400 });
      await expect(getSession({ id: '9999' }, imam.id)).rejects.toMatchObject({ status: 404 });

      const otherImam = await prisma.user.create({ data: { name: 'Other', email: 'other@example.com', password: 'hash', role: 'imam' } });
      await expect(getSession({ id: String(session.id) }, otherImam.id)).rejects.toMatchObject({ status: 403 });
      await expect(getSession({ id: String(session.id) }, imam.id)).resolves.toMatchObject({ id: session.id });

      // 3. Join session
      await expect(joinSession({ id: 'bad' }, listener.id)).rejects.toMatchObject({ status: 400 });
      await expect(joinSession({ id: '9999' }, listener.id)).rejects.toMatchObject({ status: 404 });
      await expect(joinSession({ id: String(session.id) }, listener.id)).resolves.toMatchObject({ message: 'Joined session' });

      // 4. End session
      await expect(endSession({ id: 'bad' }, imam.id)).rejects.toMatchObject({ status: 400 });
      await expect(endSession({ id: '9999' }, imam.id)).rejects.toMatchObject({ status: 404 });
      await expect(endSession({ id: String(session.id) }, otherImam.id)).rejects.toMatchObject({ status: 403 });

      // End session with participants and translations to cover push subscription logic
      const session2 = await createSession({ title: 'S2', description: 'D2' }, imam.id);
      await joinSession({ id: String(session2.id) }, listener.id);

      // Create translation for session2
      await prisma.translation.create({ data: { sessionId: session2.id, originalText: 'Orig', translatedText: 'Trans', language: 'es' } });
      // Create push subscription for listener
      await prisma.pushSubscription.create({ data: { userId: listener.id, endpoint: 'https://example.com/endpoint', p256dh: 'p'.repeat(65), auth: 'a'.repeat(16) } });

      await expect(endSession({ id: String(session2.id) }, imam.id)).resolves.toMatchObject({ message: 'Session ended successfully' });
    });
  });

  describe('translations service', () => {
    it('covers translation CRUD branches', async () => {
      await expect(getAllTranslations({}, undefined)).rejects.toMatchObject({ status: 401 });

      const listener = await prisma.user.create({ data: { name: 'L', email: 'l@example.com', password: 'h', role: 'listener' } });
      await expect(getAllTranslations({}, listener.id)).resolves.toEqual([]);

      await expect(getTranslation({ id: '' }, listener.id)).rejects.toMatchObject({ status: 400 });
      await expect(getTranslation({ id: 'abc' }, listener.id)).rejects.toMatchObject({ status: 400 });
      await expect(getTranslation({ id: '9999' }, listener.id)).rejects.toMatchObject({ status: 404 });

      // Create a session and translation
      const imam = await prisma.user.create({ data: { name: 'Imam', email: 'imam@example.com', password: 'h', role: 'imam' } });
      const session = await createSession({ title: 'T', description: 'D' }, imam.id);

      const translation = await prisma.translation.create({ data: { sessionId: session.id, originalText: 'A', translatedText: 'B', language: 'fr' } });

      // Get translation
      await expect(getTranslation({ id: String(translation.id) }, listener.id)).resolves.toMatchObject({ id: translation.id });

      // Create translation validations
      await expect(createTranslation({ sessionId: '', originalText: 'a', translatedText: 'b', language: 'fr' }, imam.id)).rejects.toMatchObject({ status: 400 });
      await expect(createTranslation({ sessionId: '9999', originalText: 'a', translatedText: 'b', language: 'fr' }, imam.id)).rejects.toMatchObject({ status: 400 });

      const otherImam = await prisma.user.create({ data: { name: 'Other', email: 'other@example.com', password: 'h', role: 'imam' } });
      await expect(createTranslation({ sessionId: String(session.id), originalText: 'a', translatedText: 'b', language: 'fr' }, otherImam.id)).rejects.toMatchObject({ status: 403 });

      const newTrans = await createTranslation({ sessionId: String(session.id), originalText: 'a', translatedText: 'b', language: 'fr' }, imam.id);
      expect(newTrans).toMatchObject({ originalText: 'a' });

      // Replace translation validations
      await expect(replaceTranslation({ id: '', sessionId: String(session.id), originalText: 'a', translatedText: 'b', language: 'fr' }, imam.id)).rejects.toMatchObject({ status: 400 });
      await expect(replaceTranslation({ id: 'abc', sessionId: String(session.id), originalText: 'a', translatedText: 'b', language: 'fr' }, imam.id)).rejects.toMatchObject({ status: 400 });
      await expect(replaceTranslation({ id: '9999', sessionId: String(session.id), originalText: 'a', translatedText: 'b', language: 'fr' }, imam.id)).rejects.toMatchObject({ status: 404 });

      await expect(replaceTranslation({ id: String(newTrans.id), sessionId: '9999', originalText: 'a', translatedText: 'b', language: 'fr' }, imam.id)).rejects.toMatchObject({ status: 400 });
      await expect(replaceTranslation({ id: String(newTrans.id), sessionId: String(session.id), originalText: 'a', translatedText: 'b', language: 'fr' }, otherImam.id)).rejects.toMatchObject({ status: 403 });

      const replaced = await replaceTranslation({ id: String(newTrans.id), sessionId: String(session.id), originalText: 'updated', translatedText: 'b', language: 'fr' }, imam.id);
      expect(replaced).toMatchObject({ originalText: 'updated' });

      // Delete translation validations
      await expect(deleteTranslation({ id: '' }, imam.id)).rejects.toMatchObject({ status: 400 });
      await expect(deleteTranslation({ id: 'abc' }, imam.id)).rejects.toMatchObject({ status: 400 });
      await expect(deleteTranslation({ id: '9999' }, imam.id)).rejects.toMatchObject({ status: 404 });
      await expect(deleteTranslation({ id: String(newTrans.id) }, otherImam.id)).rejects.toMatchObject({ status: 403 });

      await expect(deleteTranslation({ id: String(newTrans.id) }, imam.id)).resolves.toBeUndefined();
    });
  });

  describe('forums and push services', () => {
    it('covers forums, comments, and subscriptions', async () => {
      await expect(getAllForums({}, undefined)).rejects.toMatchObject({ status: 401 });

      const user = await prisma.user.create({ data: { name: 'User', email: 'user@example.com', password: 'h', role: 'listener' } });
      await expect(getAllForums({}, user.id)).resolves.toEqual([]);

      await expect(createForumPost({ title: '', content: 'x' }, user.id)).rejects.toMatchObject({ status: 400 });

      const post = await createForumPost({ title: 'T', content: 'C' }, user.id);
      expect(post).toMatchObject({ title: 'T', content: 'C' });

      await expect(createComment({ id: 'abc', content: 'hi' }, user.id)).rejects.toMatchObject({ status: 400 });

      const comment = await createComment({ id: String(post.id), content: 'hi' }, user.id);
      expect(comment).toMatchObject({ content: 'hi' });

      await expect(getSpecificComments({ id: '' }, user.id)).rejects.toMatchObject({ status: 400 });
      await expect(getSpecificComments({ id: 'x' }, user.id)).rejects.toMatchObject({ status: 400 });

      const comments = await getSpecificComments({ id: String(post.id) }, user.id);
      expect(comments).toHaveLength(1);

      // Save push subscription validations
      await expect(savePushSubscription({ endpoint: 'https://example.com', keys: { p256dh: 'a', auth: 'b' } }, undefined)).rejects.toMatchObject({ status: 401 });
      await expect(savePushSubscription({ endpoint: '', keys: { p256dh: 'a', auth: 'b' } }, user.id)).rejects.toMatchObject({ status: 400 });

      const sub1 = await savePushSubscription({ endpoint: 'https://example.com', keys: { p256dh: 'a', auth: 'b' } }, user.id);
      expect(sub1).toMatchObject({ endpoint: 'https://example.com' });

      // Update subscription
      const sub2 = await savePushSubscription({ endpoint: 'https://example.com', keys: { p256dh: 'a', auth: 'b' } }, user.id);
      expect(sub2.id).toBe(sub1.id);
    });
  });

  describe('routes', () => {
    it('covers auth, session, users, translations, forums, and push routes', async () => {
      const authApp = createApp(authRouter);
      const sessionApp = createApp(sessionRouter({ emit: vi.fn() }));
      const usersApp = createApp(usersRouter);
      const translationsApp = createApp(translationsRouter);
      const forumsApp = createApp(forumsRouter);
      const pushApp = createApp(pushRouter);

      // 1. Auth routes
      console.log('1.1 register');
      const registerRes = await request(authApp, '/register', { method: 'POST', body: { name: 'Route User', email: 'route@example.com', password: 'StrongP@ss1', role: 'listener' } });
      expect(registerRes.response.status).toBe(201);

      console.log('1.2 login');
      const loginRes = await request(authApp, '/login', { method: 'POST', body: { email: 'route@example.com', password: 'StrongP@ss1' } });
      expect(loginRes.response.status).toBe(200);

      console.log('1.3 logout');
      const logoutRes = await request(authApp, '/logout', { method: 'POST' });
      expect(logoutRes.response.status).toBe(200);

      // Fetch user from DB for profile request
      const routeUserObj = await prisma.user.findUnique({ where: { email: 'route@example.com' } });
      const userToken = jwt.sign({ userId: routeUserObj.id }, process.env.JWT_SECRET);

      console.log('1.4 me');
      const meRes = await request(authApp, '/me', { method: 'GET', cookie: `token=${userToken}` });
      expect(meRes.response.status).toBe(200);

      console.log('1.5 request-password-change');
      const resetReqRes = await request(authApp, '/request-password-change', { method: 'POST', cookie: `token=${userToken}` });
      expect(resetReqRes.response.status).toBe(200);

      console.log('1.6 reset-password-with-token');
      const validToken = jwt.sign({ userId: routeUserObj.id }, 'test-secret' + routeUserObj.password, { expiresIn: '15m' });
      const resetRes = await request(authApp, '/reset-password-with-token', { method: 'POST', body: { token: validToken, newPassword: 'StrongP@ss1' } });
      expect(resetRes.response.status).toBe(200);

      // 2. Session routes
      const imam = await prisma.user.create({ data: { name: 'Imam R', email: 'imam_route@example.com', password: 'h', role: 'imam' } });
      const listener = await prisma.user.create({ data: { name: 'List R', email: 'list_route@example.com', password: 'h', role: 'listener' } });
      const imamToken = jwt.sign({ userId: imam.id }, process.env.JWT_SECRET);
      const listenerToken = jwt.sign({ userId: listener.id }, process.env.JWT_SECRET);

      console.log('2.1 create session');
      const sessionCreateRes = await request(sessionApp, '/', { method: 'POST', body: { title: 'T', description: 'D' }, cookie: `token=${imamToken}` });
      expect(sessionCreateRes.response.status).toBe(201);
      const sessionObj = sessionCreateRes.payload.session;

      console.log('2.2 list sessions');
      const sessionListRes = await request(sessionApp, '/', { method: 'GET', cookie: `token=${imamToken}` });
      expect(sessionListRes.response.status).toBe(200);

      console.log('2.3 join session');
      const sessionJoinRes = await request(sessionApp, `/${sessionObj.id}/join`, { method: 'POST', cookie: `token=${listenerToken}` });
      expect(sessionJoinRes.response.status).toBe(200);

      console.log('2.4 get session');
      const sessionGetRes = await request(sessionApp, `/${sessionObj.id}`, { method: 'GET', cookie: `token=${listenerToken}` });
      expect(sessionGetRes.response.status).toBe(200);

      console.log('2.5 end session');
      const sessionEndRes = await request(sessionApp, `/${sessionObj.id}/end`, { method: 'POST', cookie: `token=${imamToken}` });
      expect(sessionEndRes.response.status).toBe(200);

      // 3. Users routes
      console.log('3.1 create user');
      const userCreateRes = await request(usersApp, '/', { method: 'POST', body: { name: 'New U', role: 'listener' }, cookie: `token=${imamToken}` });
      expect(userCreateRes.response.status).toBe(201);

      console.log('3.2 list users');
      const userListRes = await request(usersApp, '/', { method: 'GET', cookie: `token=${imamToken}` });
      expect(userListRes.response.status).toBe(200);

      // 4. Translations routes
      const session3 = await prisma.session.create({ data: { title: 'S3', description: 'D', imamId: imam.id } });
      console.log('4.1 create translation');
      const translationCreateRes = await request(translationsApp, '/', { method: 'POST', body: { sessionId: session3.id, originalText: 'A', translatedText: 'B', language: 'fr' }, cookie: `token=${imamToken}` });
      expect(translationCreateRes.response.status).toBe(201);
      const transObj = translationCreateRes.payload.translation;

      console.log('4.2 list translations');
      const translationListRes = await request(translationsApp, '/', { method: 'GET', cookie: `token=${listenerToken}` });
      expect(translationListRes.response.status).toBe(200);

      console.log('4.3 get translation');
      const translationGetRes = await request(translationsApp, `/${transObj.id}`, { method: 'GET', cookie: `token=${listenerToken}` });
      expect(translationGetRes.response.status).toBe(200);

      console.log('4.4 update translation');
      const translationPutRes = await request(translationsApp, `/${transObj.id}`, { method: 'PUT', body: { sessionId: session3.id, originalText: 'new', translatedText: 'B', language: 'fr' }, cookie: `token=${imamToken}` });
      expect(translationPutRes.response.status).toBe(200);

      console.log('4.5 delete translation');
      const translationDeleteRes = await request(translationsApp, `/${transObj.id}`, { method: 'DELETE', cookie: `token=${imamToken}` });
      expect(translationDeleteRes.response.status).toBe(204);

      // 5. Forums routes
      console.log('5.1 list forums');
      const forumListRes = await request(forumsApp, '/', { method: 'GET', cookie: `token=${listenerToken}` });
      expect(forumListRes.response.status).toBe(200);

      console.log('5.2 create forum post');
      const forumCreateRes = await request(forumsApp, '/', { method: 'POST', body: { title: 'T', content: 'C' }, cookie: `token=${listenerToken}` });
      expect(forumCreateRes.response.status).toBe(201);
      const postObj = forumCreateRes.payload.post;

      console.log('5.3 get comments');
      const commentsRes = await request(forumsApp, `/${postObj.id}/comments`, { method: 'GET', cookie: `token=${listenerToken}` });
      expect(commentsRes.response.status).toBe(200);

      console.log('5.4 create comment');
      const commentCreateRes = await request(forumsApp, `/${postObj.id}/comments`, { method: 'POST', body: { content: 'Nice' }, cookie: `token=${listenerToken}` });
      expect(commentCreateRes.response.status).toBe(201);

      // 6. Push routes
      console.log('6.1 push subscribe');
      const pushRes = await request(pushApp, '/subscribe', { method: 'POST', body: { endpoint: 'https://example.com/push', keys: { p256dh: 'a', auth: 'b' } }, cookie: `token=${listenerToken}` });
      expect(pushRes.response.status).toBe(201);
      console.log('Routes tests complete!');
    }, 15000);
  });
});
