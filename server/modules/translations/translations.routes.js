const express = require('express');
const { authenticate } = require('../common/auth.middleware');
const { getAllTranslations, getTranslation, createTranslation, replaceTranslation, deleteTranslation } = require('./translations.service');

const translationsRouter = express.Router();

translationsRouter.get('/', authenticate, async (req, res) => {
  const userId = req.user.userId;

  try {
    const translations = await getAllTranslations({}, userId);
    res.status(200).json(translations);
  } catch (error) {
    console.error('Fetch translations error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

translationsRouter.get('/:id', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const requestData = { id: req.params.id };

  try {
    const translation = await getTranslation(requestData, userId);
    res.status(200).json(translation);
  } catch (error) {
    console.error('Fetch translation by id error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to fetch translation' });
  }
});

translationsRouter.post('/', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId, originalText, translatedText, language } = req.body;
  const requestData = { sessionId, originalText, translatedText, language };

  try {
    const newTranslation = await createTranslation(requestData, userId);
    res.status(201).json({
      message: 'Translation created successfully',
      translation: newTranslation
    });
  } catch (error) {
    console.error('Create translation error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to create translation' });
  }
});

translationsRouter.put('/:id', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId, originalText, translatedText, language } = req.body;
  const requestData = { id: req.params.id, sessionId, originalText, translatedText, language };

  try {
    const updatedTranslation = await replaceTranslation(requestData, userId);
    res.status(200).json({
      message: 'Translation updated successfully',
      translation: updatedTranslation
    });
  } catch (error) {
    console.error('Replace translation error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to update translation' });
  }
});

translationsRouter.delete('/:id', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const requestData = { id: req.params.id };

  try {
    await deleteTranslation(requestData, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Delete translation error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to delete translation' });
  }
});

module.exports = translationsRouter;
