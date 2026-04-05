const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(cors());

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
  const { originalText, translatedText, language } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!originalText) missingFields.push('originalText');
  if (!translatedText) missingFields.push('translatedText');
  if (!language) missingFields.push('language');

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields
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
  const { originalText, translatedText, language } = req.body;

  // Find the translation
  const translationIndex = translations.findIndex(t => t.id === parseInt(id));

  if (translationIndex === -1) {
    return res.status(404).json({
      error: 'Translation not found',
      id: parseInt(id)
    });
  }

  // Validate required fields
  const missingFields = [];
  if (!originalText) missingFields.push('originalText');
  if (!translatedText) missingFields.push('translatedText');
  if (!language) missingFields.push('language');

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields
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
