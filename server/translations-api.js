const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// Error handling middleware for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON format',
      message: err.message
    });
  }
  next(err);
});

// In-memory data store
let translations = [
  {
    id: 1,
    originalText: 'Assalamu alaikum',
    translatedText: 'Peace be upon you',
    language: 'en',
    createdAt: new Date('2026-04-01')
  },
  {
    id: 2,
    originalText: 'Bismillah',
    translatedText: 'In the name of God',
    language: 'en',
    createdAt: new Date('2026-04-02')
  }
];

let nextId = 3;

// ============================================================================
// GET /api/translations - Returns all translations
// ============================================================================
app.get('/api/translations', (req, res) => {
  res.status(200).json(translations);
});

// ============================================================================
// GET /api/translations/:id - Returns a translation by ID
// ============================================================================
app.get('/api/translations/:id', (req, res) => {
  const { id } = req.params;
  const translation = translations.find(t => t.id === parseInt(id));

  if (!translation) {
    return res.status(404).json({
      error: 'Translation not found',
      id: parseInt(id)
    });
  }

  res.status(200).json(translation);
});

// ============================================================================
// POST /api/translations - Creates a new translation
// ============================================================================
app.post('/api/translations', (req, res) => {
  console.log('POST /api/translations - Request body:', req.body);
  
  const { originalText, translatedText, language } = req.body;

  // Check if body is empty or undefined
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      error: 'Request body is empty',
      message: 'Please provide originalText, translatedText, and language fields',
      example: {
        originalText: 'Assalamu alaikum',
        translatedText: 'Peace be upon you',
        language: 'en'
      }
    });
  }

  // Validate required fields
  const missingFields = [];
  if (!originalText || (typeof originalText === 'string' && originalText.trim() === '')) {
    missingFields.push('originalText');
  }
  if (!translatedText || (typeof translatedText === 'string' && translatedText.trim() === '')) {
    missingFields.push('translatedText');
  }
  if (!language || (typeof language === 'string' && language.trim() === '')) {
    missingFields.push('language');
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields,
      message: 'All fields are required: originalText, translatedText, language'
    });
  }

  // Validate field types
  if (typeof originalText !== 'string' || typeof translatedText !== 'string' || typeof language !== 'string') {
    return res.status(400).json({
      error: 'Invalid field types',
      message: 'All fields must be strings',
      receivedTypes: {
        originalText: typeof originalText,
        translatedText: typeof translatedText,
        language: typeof language
      }
    });
  }

  // Create new translation
  const newTranslation = {
    id: nextId++,
    originalText: originalText.trim(),
    translatedText: translatedText.trim(),
    language: language.trim(),
    createdAt: new Date()
  };

  translations.push(newTranslation);
  console.log('Translation created:', newTranslation);

  res.status(201).json({
    message: 'Translation created successfully',
    translation: newTranslation
  });
});

// ============================================================================
// PUT /api/translations/:id - Completely replaces an existing translation
// ============================================================================
app.put('/api/translations/:id', (req, res) => {
  const { id } = req.params;
  console.log(`PUT /api/translations/${id} - Request body:`, req.body);

  // Check if body is empty or undefined
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      error: 'Request body is empty',
      message: 'Please provide originalText, translatedText, and language fields',
      example: {
        originalText: 'Updated text',
        translatedText: 'Updated translation',
        language: 'en'
      }
    });
  }

  // Find the translation
  const translationIndex = translations.findIndex(t => t.id === parseInt(id));

  if (translationIndex === -1) {
    return res.status(404).json({
      error: 'Translation not found',
      id: parseInt(id)
    });
  }

  const { originalText, translatedText, language } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!originalText || (typeof originalText === 'string' && originalText.trim() === '')) {
    missingFields.push('originalText');
  }
  if (!translatedText || (typeof translatedText === 'string' && translatedText.trim() === '')) {
    missingFields.push('translatedText');
  }
  if (!language || (typeof language === 'string' && language.trim() === '')) {
    missingFields.push('language');
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields,
      message: 'All fields are required: originalText, translatedText, language'
    });
  }

  // Validate field types
  if (typeof originalText !== 'string' || typeof translatedText !== 'string' || typeof language !== 'string') {
    return res.status(400).json({
      error: 'Invalid field types',
      message: 'All fields must be strings',
      receivedTypes: {
        originalText: typeof originalText,
        translatedText: typeof translatedText,
        language: typeof language
      }
    });
  }

  // Replace the translation
  const updatedTranslation = {
    id: parseInt(id),
    originalText: originalText.trim(),
    translatedText: translatedText.trim(),
    language: language.trim(),
    createdAt: translations[translationIndex].createdAt,
    updatedAt: new Date()
  };

  translations[translationIndex] = updatedTranslation;
  console.log('Translation updated:', updatedTranslation);

  res.status(200).json({
    message: 'Translation updated successfully',
    translation: updatedTranslation
  });
});

// ============================================================================
// DELETE /api/translations/:id - Deletes a translation
// ============================================================================
app.delete('/api/translations/:id', (req, res) => {
  const { id } = req.params;
  const translationIndex = translations.findIndex(t => t.id === parseInt(id));

  if (translationIndex === -1) {
    return res.status(404).json({
      error: 'Translation not found',
      id: parseInt(id)
    });
  }

  // Remove the translation
  const deletedTranslation = translations.splice(translationIndex, 1)[0];

  res.status(204).send();
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
