const express = require('express');
const { authenticate } = require('../common/auth.middleware');
const { getAllForums, createForumPost, createComment, getSpecificComments } = require('./forums.service');

const forumsRouter = express.Router();

forumsRouter.get('/', authenticate, async (req, res) => {
  const userId = req.user.userId;

  try {
    const forums = await getAllForums({}, userId);
    res.status(200).json(forums);
  } catch (error) {
    console.error('Fetch forums error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to fetch forums' });
  }
});

forumsRouter.post('/', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { title, content } = req.body;

  try {
    const newPost = await createForumPost({ title, content }, userId);
    res.status(201).json({
      message: 'Forum post created successfully',
      post: newPost
    });
  } catch (error) {
    console.error('Forum post creation error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to create forum post' });
  }
});

forumsRouter.get('/:id/comments', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const requestData = { id: req.params.id };

  try {
    const comments = await getSpecificComments(requestData, userId);
    res.status(200).json(comments);
  } catch (error) {
    console.error('Fetch specific comments error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

forumsRouter.post('/:id/comments', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { content, parentId, repliedToName } = req.body;
  const requestData = { id: req.params.id, content, parentId, repliedToName };

  try {
    const newComment = await createComment(requestData, userId);
    res.status(201).json({
      message: 'Comment created successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Comment creation error:', error);
    if (error.status && error.payload) {
      return res.status(error.status).json(error.payload);
    }
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

module.exports = forumsRouter;
