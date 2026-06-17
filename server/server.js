require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');
const authRouter = require('./modules/auth/auth.routes');
const usersRouter = require('./modules/users/users.routes');
const createSessionRouter = require('./modules/session/session.routes');
const translationsRouter = require('./modules/translations/translations.routes');
const forumsRouter = require('./modules/forums/forums.routes');
const pushRouter = require('./modules/push/push.routes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Initialize Prisma client
const prisma = new PrismaClient();

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(cookieParser());

// ============================================================================
// STATIC FILES (Next.js export)
// ============================================================================
const CLIENT_BUILD_PATH = process.env.CLIENT_BUILD_PATH || path.join(__dirname, '../client/out');

// Serve the statically compiled Next.js app. The `extensions` option lets
// routes like /listener resolve to /listener.html from the export.
app.use(express.static(CLIENT_BUILD_PATH, { extensions: ['html'] }));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const TRANSLATE_ENDPOINTS = [
  process.env.LIBRETRANSLATE_URL || 'https://translate.argosopentech.com/translate',
  'https://libretranslate.com/translate'
];

async function translateText(text, targetLang) {
  if (!text) {
    return text;
  }

  const payload = {
    q: text,
    source: 'auto',
    target: targetLang,
    format: 'text'
  };

  for (const endpoint of TRANSLATE_ENDPOINTS) {
    try {
      const response = await axios.post(endpoint, payload, { timeout: 10000 });
      if (response?.data?.translatedText) {
        return response.data.translatedText;
      }
      console.error('Translation returned unexpected response from', endpoint, response?.data);
    } catch (error) {
      console.error('Translation endpoint failed:', endpoint, error?.response?.status || error?.code || error?.message);
    }
  }

  console.error('Translation failed for all endpoints; using source text fallback.');
  return text;
}

// ============================================================================
// SOCKET.IO EVENTS
// ============================================================================
let connectedClients = 0;
let sessionActive = false;

io.on('connection', (socket) => {
  connectedClients++;
  console.log(`A user connected. Total clients: ${connectedClients}`);

  // Send current status to new client
  socket.emit('listenerCount', connectedClients);
  socket.emit('sessionStatus', { active: sessionActive });

  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`User disconnected. Total clients: ${connectedClients}`);
    io.emit('listenerCount', connectedClients);
  });

  // Handle speech input and translation
  socket.on('speech', (data) => {
    if (!data?.sessionId) {
      return;
    }

    const sessionId = Number(data.sessionId);
    if (!Number.isFinite(sessionId)) {
      return;
    }

    const originalText = String(data.text || '').trim();
    if (!originalText) {
      return;
    }

    const messageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Emit the original text immediately so listeners see it right away.
    io.emit('translation', {
      id: messageId,
      original: originalText,
      german: originalText,
      english: originalText,
      isTranslated: false
    });

    // Translate asynchronously and emit a correction only if translation succeeds.
    const processTranslation = async () => {
      try {
        const [german, english] = await Promise.all([
          translateText(originalText, 'de'),
          translateText(originalText, 'en')
        ]);

        const savePromises = [];
        const updatePayload = { id: messageId };

        if (german) {
          updatePayload.german = german;
          savePromises.push(prisma.translation.create({
            data: { sessionId, originalText, translatedText: german, language: 'de' }
          }));
        }

        if (english) {
          updatePayload.english = english;
          savePromises.push(prisma.translation.create({
            data: { sessionId, originalText, translatedText: english, language: 'en' }
          }));
        }

        if (Object.keys(updatePayload).length > 1) {
          io.emit('translationUpdate', updatePayload);
          await Promise.all(savePromises);
        }
      } catch (err) {
        console.error('Failed to translate and save speech asynchronously:', err);
      }
    };

    void processTranslation();
  });

  // Handle session management
  socket.on('startSession', (data) => {
    sessionActive = true;
    io.emit('sessionStatus', { active: true });
    console.log(`Session started: ${data?.sessionId}`);
  });

  socket.on('endSession', async (data) => {
    sessionActive = false;
    io.emit('sessionStatus', { active: false });
    io.emit('sessionEnded');
    
    if (data?.sessionId) {
      try {
        const translationsCount = await prisma.translation.count({
          where: { sessionId: data.sessionId }
        });

        if (translationsCount === 0) {
          await prisma.session.delete({
            where: { id: data.sessionId }
          });
          console.log(`Session ${data.sessionId} deleted (no content).`);
        } else {
          await prisma.session.update({
            where: { id: data.sessionId },
            data: { isActive: false }
          });
          console.log(`Session ${data.sessionId} ended and stored.`);
        }
      } catch (err) {
        console.error('Failed to end session in DB:', err);
      }
    }
  });
});

// ============================================================================
// STATUS ENDPOINT
// ============================================================================
app.get('/status', (req, res) => {
  res.json({ status: 'running', clients: connectedClients, sessionActive });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/sessions', createSessionRouter(io));
app.use('/api/translations', translationsRouter);
app.use('/api/forums', forumsRouter);
app.use('/api/push', pushRouter);

// ============================================================================
// START SERVER
// ============================================================================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}`);
  console.log(`
✓ Socket.IO server ready
✓ Express API ready

Available endpoints:
  GET    /status                    - Server status
  POST   /api/auth/register         - Register user
  POST   /api/auth/login            - Login user
  POST   /api/auth/logout           - Logout user
  GET    /api/auth/me               - Get current user
  GET    /api/users                 - Get all users
  POST   /api/users                 - Create user
  POST   /api/sessions              - Create session
  GET    /api/sessions              - Get all sessions
  GET    /api/sessions/:id          - Get session by ID
  GET    /api/translations          - Get all translations
  GET    /api/translations/:id      - Get translation by ID
  POST   /api/translations          - Create translation
  PUT    /api/translations/:id      - Update translation
  DELETE /api/translations/:id      - Delete translation
  `);
});

// Error handling for undefined routes (placed after all routes)
app.use((req, res) => {
  // API/socket routes that fall through are genuine 404s.
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method
    });
  }

  // The Next.js export is a multi-page site, so valid routes are already
  // resolved by express.static above (e.g. /stored/view -> stored/view.html).
  // Anything reaching here is a real not-found, so serve the exported 404 page.
  res.status(404).sendFile(path.join(CLIENT_BUILD_PATH, '404.html'));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});