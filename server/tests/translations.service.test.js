import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const { getAllTranslations, getTranslation, createTranslation, replaceTranslation, deleteTranslation } = await import('../modules/translations/translations.service');

describe('translations service unit tests', () => {
  let imam;
  let listener;
  let session;

  beforeEach(async () => {
    await prisma.$transaction([
      prisma.translation.deleteMany(),
      prisma.session.deleteMany(),
      prisma.pushSubscription.deleteMany(),
      prisma.forumComment.deleteMany(),
      prisma.forumPost.deleteMany(),
      prisma.user.deleteMany()
    ]);

    imam = await prisma.user.create({
      data: { name: 'Imam', email: 'imam@example.com', password: 'hashed-password', role: 'imam' }
    });

    listener = await prisma.user.create({
      data: { name: 'Listener', email: 'listener@example.com', password: 'hashed-password', role: 'listener' }
    });

    session = await prisma.session.create({
      data: { title: 'Test Sermon', description: 'Desc', imamId: imam.id }
    });
  });

  describe('getAllTranslations', () => {
    it('rejects if user is not authenticated', async () => {
      await expect(getAllTranslations({}, undefined)).rejects.toMatchObject({
        status: 401,
        payload: { error: 'User must be authenticated' }
      });
    });

    it('returns all translations', async () => {
      const translation = await prisma.translation.create({
        data: { sessionId: session.id, originalText: 'Hello', translatedText: 'Hallo', language: 'de' }
      });

      const result = await getAllTranslations({}, imam.id);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(translation.id);
      expect(result[0].originalText).toBe('Hello');
    });
  });

  describe('getTranslation', () => {
    it('rejects if user is not authenticated', async () => {
      await expect(getTranslation({ id: '1' }, undefined)).rejects.toMatchObject({
        status: 401,
        payload: { error: 'User must be authenticated' }
      });
    });

    it('rejects if id is missing or NaN', async () => {
      await expect(getTranslation({}, imam.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Translation id is required' }
      });

      await expect(getTranslation({ id: 'abc' }, imam.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid translation id' }
      });
    });

    it('rejects if translation does not exist', async () => {
      await expect(getTranslation({ id: '99999' }, imam.id)).rejects.toMatchObject({
        status: 404,
        payload: { error: 'Translation not found', id: 99999 }
      });
    });

    it('returns translation if found', async () => {
      const translation = await prisma.translation.create({
        data: { sessionId: session.id, originalText: 'Hello', translatedText: 'Hallo', language: 'de' }
      });

      const result = await getTranslation({ id: String(translation.id) }, imam.id);
      expect(result.id).toBe(translation.id);
      expect(result.originalText).toBe('Hello');
    });
  });

  describe('createTranslation', () => {
    it('rejects if user is not authenticated', async () => {
      await expect(createTranslation({}, undefined)).rejects.toMatchObject({
        status: 401,
        payload: { error: 'User must be authenticated' }
      });
    });

    it('rejects if required fields are missing', async () => {
      await expect(createTranslation({ sessionId: session.id }, imam.id)).rejects.toMatchObject({
        status: 400,
        payload: {
          error: 'Missing required fields',
          missingFields: ['originalText', 'translatedText', 'language']
        }
      });
    });

    it('rejects if session does not exist', async () => {
      await expect(createTranslation({
        sessionId: '99999',
        originalText: 'Hello',
        translatedText: 'Hallo',
        language: 'de'
      }, imam.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid sessionId - session does not exist' }
      });
    });

    it('rejects if caller is not the owner of the session', async () => {
      const otherImam = await prisma.user.create({
        data: { name: 'Other', email: 'other@example.com', password: 'hashed-password', role: 'imam' }
      });

      await expect(createTranslation({
        sessionId: String(session.id),
        originalText: 'Hello',
        translatedText: 'Hallo',
        language: 'de'
      }, otherImam.id)).rejects.toMatchObject({
        status: 403,
        payload: { error: 'Access denied - you can only add translations to your own sessions' }
      });
    });

    it('creates translation successfully', async () => {
      const result = await createTranslation({
        sessionId: String(session.id),
        originalText: ' Hello ',
        translatedText: ' Hallo ',
        language: ' de '
      }, imam.id);

      expect(result.id).toBeDefined();
      expect(result.originalText).toBe('Hello');
      expect(result.translatedText).toBe('Hallo');
      expect(result.language).toBe('de');
    });
  });

  describe('replaceTranslation', () => {
    let translation;

    beforeEach(async () => {
      translation = await prisma.translation.create({
        data: { sessionId: session.id, originalText: 'Hi', translatedText: 'Hallo', language: 'de' }
      });
    });

    it('rejects if user is not authenticated', async () => {
      await expect(replaceTranslation({}, undefined)).rejects.toMatchObject({
        status: 401,
        payload: { error: 'User must be authenticated' }
      });
    });

    it('rejects if required fields are missing', async () => {
      await expect(replaceTranslation({ id: translation.id }, imam.id)).rejects.toMatchObject({
        status: 400,
        payload: {
          error: 'Missing required fields',
          missingFields: ['sessionId', 'originalText', 'translatedText', 'language']
        }
      });
    });

    it('rejects if translation id is NaN', async () => {
      await expect(replaceTranslation({
        id: 'abc',
        sessionId: String(session.id),
        originalText: 'Hello',
        translatedText: 'Hallo',
        language: 'de'
      }, imam.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid translation id' }
      });
    });

    it('rejects if translation does not exist', async () => {
      await expect(replaceTranslation({
        id: '99999',
        sessionId: String(session.id),
        originalText: 'Hello',
        translatedText: 'Hallo',
        language: 'de'
      }, imam.id)).rejects.toMatchObject({
        status: 404,
        payload: { error: 'Translation not found', id: 99999 }
      });
    });

    it('rejects if target session does not exist', async () => {
      await expect(replaceTranslation({
        id: String(translation.id),
        sessionId: '99999',
        originalText: 'Hello',
        translatedText: 'Hallo',
        language: 'de'
      }, imam.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid sessionId - session does not exist' }
      });
    });

    it('rejects if caller does not own the target session', async () => {
      const otherImam = await prisma.user.create({
        data: { name: 'Other', email: 'other@example.com', password: 'hashed-password', role: 'imam' }
      });

      await expect(replaceTranslation({
        id: String(translation.id),
        sessionId: String(session.id),
        originalText: 'Hello',
        translatedText: 'Hallo',
        language: 'de'
      }, otherImam.id)).rejects.toMatchObject({
        status: 403,
        payload: { error: 'Access denied - you can only modify translations in your own sessions' }
      });
    });

    it('updates translation successfully', async () => {
      const result = await replaceTranslation({
        id: String(translation.id),
        sessionId: String(session.id),
        originalText: ' Updated Original ',
        translatedText: ' Updated Translation ',
        language: ' en '
      }, imam.id);

      expect(result.id).toBe(translation.id);
      expect(result.originalText).toBe('Updated Original');
      expect(result.translatedText).toBe('Updated Translation');
      expect(result.language).toBe('en');
    });
  });

  describe('deleteTranslation', () => {
    let translation;

    beforeEach(async () => {
      translation = await prisma.translation.create({
        data: { sessionId: session.id, originalText: 'Hi', translatedText: 'Hallo', language: 'de' }
      });
    });

    it('rejects if user is not authenticated', async () => {
      await expect(deleteTranslation({ id: String(translation.id) }, undefined)).rejects.toMatchObject({
        status: 401,
        payload: { error: 'User must be authenticated' }
      });
    });

    it('rejects if id is missing or NaN', async () => {
      await expect(deleteTranslation({}, imam.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Translation id is required' }
      });

      await expect(deleteTranslation({ id: 'abc' }, imam.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid translation id' }
      });
    });

    it('rejects if translation does not exist', async () => {
      await expect(deleteTranslation({ id: '99999' }, imam.id)).rejects.toMatchObject({
        status: 404,
        payload: { error: 'Translation not found', id: 99999 }
      });
    });

    it('rejects if caller is not the owner of the translation session', async () => {
      const otherImam = await prisma.user.create({
        data: { name: 'Other', email: 'other@example.com', password: 'hashed-password', role: 'imam' }
      });

      await expect(deleteTranslation({ id: String(translation.id) }, otherImam.id)).rejects.toMatchObject({
        status: 403,
        payload: { error: 'Access denied - you can only delete translations from your own sessions' }
      });
    });

    it('deletes translation successfully', async () => {
      await deleteTranslation({ id: String(translation.id) }, imam.id);

      const check = await prisma.translation.findUnique({ where: { id: translation.id } });
      expect(check).toBeNull();
    });
  });
});
