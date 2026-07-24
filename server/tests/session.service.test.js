import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const { createSession, getSession, joinSession, endSession } = await import('../modules/session/session.service');

describe('session service', () => {
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

  it('creates a session for an imam user', async () => {
    const user = await prisma.user.create({
      data: { name: 'Imam', email: 'imam@example.com', password: 'hashed-password', role: 'imam' }
    });

    const result = await createSession({ title: ' Friday Sermon ', description: ' Live ' }, user.id);

    expect(result.title).toBe('Friday Sermon');
    expect(result.description).toBe('Live');
    expect(result.imamId).toBe(user.id);
  });

  it('blocks non-imams from creating sessions', async () => {
    const user = await prisma.user.create({
      data: { name: 'Listener', email: 'listener@example.com', password: 'hashed-password', role: 'listener' }
    });

    await expect(createSession({ title: 'Test', description: 'Desc' }, user.id)).rejects.toMatchObject({
      status: 403,
      payload: { error: 'Only imams can create sessions' }
    });
  });

  it('returns a session when the caller is authorized', async () => {
    const imam = await prisma.user.create({
      data: { name: 'Imam', email: 'imam2@example.com', password: 'hashed-password', role: 'imam' }
    });
    const participant = await prisma.user.create({
      data: { name: 'Participant', email: 'participant@example.com', password: 'hashed-password', role: 'listener' }
    });
    const session = await createSession({ title: 'Test Session', description: 'Desc' }, imam.id);
    await prisma.session.update({
      where: { id: session.id },
      data: { participants: { connect: { id: participant.id } } }
    });

    const result = await getSession({ id: session.id }, participant.id);

    expect(result.id).toBe(session.id);
  });

  it('rejects access to a session when the caller is not authorized', async () => {
    const imam = await prisma.user.create({
      data: { name: 'Imam', email: 'imam3@example.com', password: 'hashed-password', role: 'imam' }
    });
    const session = await prisma.session.create({
      data: { imamId: imam.id, title: 'Private Session', description: 'Desc' }
    });

    await expect(getSession({ id: session.id }, 999)).rejects.toMatchObject({
      status: 403,
      payload: { error: 'Unauthorized access to session' }
    });
  });

  it('adds a participant to a session', async () => {
    const imam = await prisma.user.create({
      data: { name: 'Imam', email: 'imam4@example.com', password: 'hashed-password', role: 'imam' }
    });
    const user = await prisma.user.create({
      data: { name: 'Listener', email: 'listener2@example.com', password: 'hashed-password', role: 'listener' }
    });
    const session = await prisma.session.create({
      data: { imamId: imam.id, title: 'Joinable Session', description: 'Desc' }
    });

    const result = await joinSession({ id: session.id }, user.id);

    expect(result.message).toBe('Joined session');
    const refreshedSession = await prisma.session.findUnique({ where: { id: session.id }, include: { participants: true } });
    expect(refreshedSession.participants.some((participant) => participant.id === user.id)).toBe(true);
  });

  it('deletes a session with no translations and sends no push notifications', async () => {
    const imam = await prisma.user.create({
      data: { name: 'Imam', email: 'imam5@example.com', password: 'hashed-password', role: 'imam' }
    });
    const session = await prisma.session.create({
      data: { imamId: imam.id, title: 'Empty Session', description: 'Desc' }
    });

    const result = await endSession({ id: session.id }, imam.id);

    expect(result.message).toBe('Session ended successfully');
    const deleted = await prisma.session.findUnique({ where: { id: session.id } });
    expect(deleted).toBeNull();
  });

  it('rejects ending a session with an invalid session ID', async () => {
    const imam = await prisma.user.create({
      data: { name: 'Imam', email: 'imam6@example.com', password: 'hashed-password', role: 'imam' }
    });

    await expect(endSession({ id: 'abc' }, imam.id)).rejects.toMatchObject({
      status: 400,
      payload: { error: 'Invalid session ID' }
    });
  });

  it('rejects ending a session if the session does not exist', async () => {
    const imam = await prisma.user.create({
      data: { name: 'Imam', email: 'imam7@example.com', password: 'hashed-password', role: 'imam' }
    });

    await expect(endSession({ id: '999999' }, imam.id)).rejects.toMatchObject({
      status: 404,
      payload: { error: 'Session not found' }
    });
  });
});
