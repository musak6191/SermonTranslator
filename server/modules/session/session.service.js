import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';
const prisma = new PrismaClient();

const createSession = async (data, userId) => {
  const { title, description } = data;

  if (!title || !description) {
    const error = new Error('Missing required fields');
    error.status = 400;
    error.payload = {
      error: 'Missing required fields',
      required: ['title', 'description']
    };
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    const error = new Error('User does not exist');
    error.status = 400;
    error.payload = {
      error: 'User does not exist'
    };
    throw error;
  }

  if (user.role !== 'imam') {
    const error = new Error('Only imams can create sessions');
    error.status = 403;
    error.payload = {
      error: 'Only imams can create sessions'
    };
    throw error;
  }

  const newSession = await prisma.session.create({
    data: {
      imamId: userId,
      title: title.trim(),
      description: description.trim()
    },
    include: {
      imam: true,
      participants: true,
      translations: true
    }
  });

  return newSession;
};

const getSession = async (data, userId) => {
  const sessionId = data?.id;
  const parsedId = Number.isFinite(Number(sessionId)) ? parseInt(sessionId, 10) : null;

  if (!parsedId) {
    const error = new Error('Invalid session ID');
    error.status = 400;
    error.payload = {
      error: 'Invalid session ID'
    };
    throw error;
  }

  const session = await prisma.session.findUnique({
    where: { id: parsedId },
    include: {
      imam: true,
      participants: true,
      translations: true
    }
  });

  if (!session) {
    const error = new Error('Session not found');
    error.status = 404;
    error.payload = {
      error: 'Session not found',
      id: parsedId
    };
    throw error;
  }

  // IDOR guard: only the session imam or a registered participant may view details.
  if (session.imamId !== userId && !session.participants.some(p => p.id === userId)) {
    const error = new Error('Unauthorized access to session');
    error.status = 403;
    error.payload = {
      error: 'Unauthorized access to session'
    };
    throw error;
  }

  return session;
};

const joinSession = async (data, userId) => {
  const sessionId = data?.id;
  const parsedId = Number.isFinite(Number(sessionId)) ? parseInt(sessionId, 10) : null;

  if (!parsedId) {
    const error = new Error('Invalid session ID');
    error.status = 400;
    error.payload = {
      error: 'Invalid session ID'
    };
    throw error;
  }

  const session = await prisma.session.findUnique({ where: { id: parsedId } });

  if (!session) {
    const error = new Error('Session not found');
    error.status = 404;
    error.payload = {
      error: 'Session not found'
    };
    throw error;
  }

  await prisma.session.update({
    where: { id: parsedId },
    data: { participants: { connect: { id: userId } } }
  });

  return { message: 'Joined session' };
};

const endSession = async (data, userId) => {
  const sessionId = data?.id;
  const parsedId = Number.isFinite(Number(sessionId)) ? parseInt(sessionId, 10) : null;

  if (!parsedId) {
    const error = new Error('Invalid session ID');
    error.status = 400;
    error.payload = {
      error: 'Invalid session ID'
    };
    throw error;
  }

  const session = await prisma.session.findUnique({
    where: { id: parsedId },
    include: {
      translations: true,
      participants: {
        include: { pushSubscriptions: true }
      }
    }
  });

  if (!session) {
    const error = new Error('Session not found');
    error.status = 404;
    error.payload = {
      error: 'Session not found'
    };
    throw error;
  }

  if (session.imamId !== userId) {
    const error = new Error('Only the session imam can end this session');
    error.status = 403;
    error.payload = {
      error: 'Only the session imam can end this session'
    };
    throw error;
  }

  if (session.translations.length === 0) {
    await prisma.session.delete({ where: { id: parsedId } });
  } else {
    await prisma.session.update({
      where: { id: parsedId },
      data: { isActive: false }
    });
  }

  if (session.participants && session.participants.length > 0) {
    const payload = JSON.stringify({
      title: 'Sermon Ended',
      body: 'The sermon you were listening to has ended.',
      url: '/listener'
    });

    const pushPromises = [];
    for (const participant of session.participants) {
      for (const sub of participant.pushSubscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        };

        pushPromises.push(
          webpush.sendNotification(pushSubscription, payload).catch(async (err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
            } else {
              console.error('Error sending push notification:', err);
              console.error('statusCode:', err.statusCode);
              console.error('keys:', Object.keys(err));
            }
          })
        );
      }
    }

    await Promise.all(pushPromises);
  }

  return { message: 'Session ended successfully' };
};

const getAllSession = async (data, userId) => {
  const sessions = await prisma.session.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      imam: true,
      participants: true,
      translations: true
    }
  });

  return sessions;
};

export {
  createSession,
  getSession,
  joinSession,
  getAllSession,
  endSession
};
