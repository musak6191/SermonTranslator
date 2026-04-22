const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = 3001;

// Initialize Prisma client
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(cors());

// ============================================================================
// POST /api/users - Create a new user
// ============================================================================
app.post('/api/users', async (req, res) => {
  const { name, role } = req.body;

  // Validate required fields
  if (!name || !role) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['name', 'role']
    });
  }

  // Validate role
  if (!['imam', 'listener'].includes(role)) {
    return res.status(400).json({
      error: 'Invalid role. Must be "imam" or "listener"'
    });
  }

  try {
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        role: role.trim()
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ============================================================================
// GET /api/users - Get all users
// ============================================================================
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ============================================================================
// POST /api/sessions - Create a new session
// ============================================================================
app.post('/api/sessions', async (req, res) => {
  const { imamId, title } = req.body;

  // Validate required fields
  if (!imamId || !title) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['imamId', 'title']
    });
  }

  try {
    // Verify imam exists
    const imam = await prisma.user.findUnique({
      where: { id: parseInt(imamId) }
    });

    if (!imam) {
      return res.status(400).json({
        error: 'Invalid imamId - user does not exist'
      });
    }

    if (imam.role !== 'imam') {
      return res.status(400).json({
        error: 'User must have role "imam" to create a session'
      });
    }

    const newSession = await prisma.session.create({
      data: {
        imamId: parseInt(imamId),
        title: title.trim()
      },
      include: {
        imam: true,
        participants: true,
        translations: true
      }
    });

    res.status(201).json({
      message: 'Session created successfully',
      session: newSession
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// ============================================================================
// GET /api/sessions - Get all sessions
// ============================================================================
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        imam: true,
        participants: true,
        translations: true
      }
    });
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// ============================================================================
// GET /api/sessions/:id - Get session by ID
// ============================================================================
app.get('/api/sessions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(id) },
      include: {
        imam: true,
        participants: true,
        translations: true
      }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        id: parseInt(id)
      });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// ============================================================================
// GET /api/translations - Returns all translations
// ============================================================================
app.get('/api/translations', async (req, res) => {
  try {
    const translations = await prisma.translation.findMany({
      include: {
        session: true
      }
    });
    res.status(200).json(translations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

// ============================================================================
// GET /api/translations/:id - Returns a translation by ID
// ============================================================================
app.get('/api/translations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const translation = await prisma.translation.findUnique({
      where: { id: parseInt(id) },
      include: {
        session: true
      }
    });

    if (!translation) {
      return res.status(404).json({
        error: 'Translation not found',
        id: parseInt(id)
      });
    }

    res.status(200).json(translation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch translation' });
  }
});

// ============================================================================
// POST /api/translations - Creates a new translation
// ============================================================================
app.post('/api/translations', async (req, res) => {
  const { sessionId, originalText, translatedText, language } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!sessionId) missingFields.push('sessionId');
  if (!originalText) missingFields.push('originalText');
  if (!translatedText) missingFields.push('translatedText');
  if (!language) missingFields.push('language');

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields
    });
  }

  try {
    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) }
    });

    if (!session) {
      return res.status(400).json({
        error: 'Invalid sessionId - session does not exist'
      });
    }

    // Create new translation
    const newTranslation = await prisma.translation.create({
      data: {
        sessionId: parseInt(sessionId),
        originalText: originalText.trim(),
        translatedText: translatedText.trim(),
        language: language.trim()
      },
      include: {
        session: true
      }
    });

    res.status(201).json({
      message: 'Translation created successfully',
      translation: newTranslation
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create translation' });
  }
});

// ============================================================================
// PUT /api/translations/:id - Completely replaces an existing translation
// ============================================================================
app.put('/api/translations/:id', async (req, res) => {
  const { id } = req.params;
  const { sessionId, originalText, translatedText, language } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!sessionId) missingFields.push('sessionId');
  if (!originalText) missingFields.push('originalText');
  if (!translatedText) missingFields.push('translatedText');
  if (!language) missingFields.push('language');

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields
    });
  }

  try {
    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) }
    });

    if (!session) {
      return res.status(400).json({
        error: 'Invalid sessionId - session does not exist'
      });
    }

    // Update the translation
    const updatedTranslation = await prisma.translation.update({
      where: { id: parseInt(id) },
      data: {
        sessionId: parseInt(sessionId),
        originalText: originalText.trim(),
        translatedText: translatedText.trim(),
        language: language.trim()
      },
      include: {
        session: true
      }
    });

    res.status(200).json({
      message: 'Translation updated successfully',
      translation: updatedTranslation
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Translation not found',
        id: parseInt(id)
      });
    }
    res.status(500).json({ error: 'Failed to update translation' });
  }
});

// ============================================================================
// DELETE /api/translations/:id - Deletes a translation
// ============================================================================
app.delete('/api/translations/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.translation.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Translation not found',
        id: parseInt(id)
      });
    }
    res.status(500).json({ error: 'Failed to delete translation' });
  }
});

// ============================================================================
// Error handling for undefined routes
// ============================================================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ============================================================================
// Graceful shutdown
// ============================================================================
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

// ============================================================================
// Start server
// ============================================================================
app.listen(PORT, () => {
  console.log(`Translation API server running on http://localhost:${PORT}`);
  console.log(`
Available endpoints:
  GET    /api/translations          - Get all translations
  GET    /api/translations/:id      - Get a specific translation
  POST   /api/translations          - Create a new translation
  PUT    /api/translations/:id      - Update a translation
  DELETE /api/translations/:id      - Delete a translation
  `);
});
