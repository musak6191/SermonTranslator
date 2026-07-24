import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const { savePushSubscription } = await import('../modules/push/push.service');

describe('push service unit tests', () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.translation.deleteMany(),
      prisma.session.deleteMany(),
      prisma.pushSubscription.deleteMany(),
      prisma.forumComment.deleteMany(),
      prisma.forumPost.deleteMany(),
      prisma.user.deleteMany()
    ]);
  });

  it('rejects subscription save if user is not authenticated', async () => {
    await expect(savePushSubscription({}, undefined)).rejects.toMatchObject({
      status: 401,
      payload: { error: 'User must be authenticated' }
    });
  });

  it('rejects subscription if endpoint or keys are missing', async () => {
    await expect(savePushSubscription({}, 1)).rejects.toMatchObject({
      status: 400,
      payload: {
        error: 'Missing required fields',
        missingFields: ['endpoint', 'keys']
      }
    });

    await expect(savePushSubscription({ endpoint: 'https://example.com' }, 1)).rejects.toMatchObject({
      status: 400,
      payload: {
        error: 'Missing required fields',
        missingFields: ['keys']
      }
    });

    await expect(savePushSubscription({ endpoint: 'https://example.com', keys: { auth: 'auth' } }, 1)).rejects.toMatchObject({
      status: 400,
      payload: {
        error: 'Missing required fields',
        missingFields: ['keys']
      }
    });
  });

  it('creates a new push subscription successfully', async () => {
    const user = await prisma.user.create({
      data: { name: 'Test User', email: 'test@example.com', password: 'hashed-password', role: 'listener' }
    });

    const subscriptionData = {
      endpoint: 'https://example.com/test-endpoint',
      keys: { p256dh: 'test-p256dh', auth: 'test-auth' }
    };

    const result = await savePushSubscription(subscriptionData, user.id);

    expect(result.id).toBeDefined();
    expect(result.userId).toBe(user.id);
    expect(result.endpoint).toBe(subscriptionData.endpoint);
    expect(result.p256dh).toBe(subscriptionData.keys.p256dh);
    expect(result.auth).toBe(subscriptionData.keys.auth);

    const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });

  it('updates an existing push subscription if endpoint matches', async () => {
    const user = await prisma.user.create({
      data: { name: 'Test User', email: 'test@example.com', password: 'hashed-password', role: 'listener' }
    });

    const subscriptionData = {
      endpoint: 'https://example.com/test-endpoint',
      keys: { p256dh: 'test-p256dh', auth: 'test-auth' }
    };

    const sub1 = await savePushSubscription(subscriptionData, user.id);
    expect(sub1.id).toBeDefined();

    const updatedData = {
      endpoint: 'https://example.com/test-endpoint',
      keys: { p256dh: 'updated-p256dh', auth: 'updated-auth' }
    };

    const sub2 = await savePushSubscription(updatedData, user.id);
    expect(sub2.id).toBe(sub1.id);
    expect(sub2.p256dh).toBe(updatedData.keys.p256dh);
    expect(sub2.auth).toBe(updatedData.keys.auth);

    const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });
});
