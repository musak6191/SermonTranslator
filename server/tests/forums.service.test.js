import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const { getAllForums, createForumPost, createComment, getSpecificComments } = await import('../modules/forums/forums.service');

describe('forums service unit tests', () => {
  let user;

  beforeEach(async () => {
    await prisma.$transaction([
      prisma.translation.deleteMany(),
      prisma.session.deleteMany(),
      prisma.pushSubscription.deleteMany(),
      prisma.forumComment.deleteMany(),
      prisma.forumPost.deleteMany(),
      prisma.user.deleteMany()
    ]);

    user = await prisma.user.create({
      data: { name: 'Imam', email: 'imam@example.com', password: 'hashed-password', role: 'imam' }
    });
  });

  describe('getAllForums', () => {
    it('rejects if user is not authenticated', async () => {
      await expect(getAllForums({}, undefined)).rejects.toMatchObject({
        status: 401,
        payload: { error: 'User must be authenticated' }
      });
    });

    it('returns all forum posts in descending order of creation', async () => {
      const post1 = await prisma.forumPost.create({
        data: { title: 'First Post', content: 'Content 1', authorId: user.id }
      });

      const post2 = await prisma.forumPost.create({
        data: { title: 'Second Post', content: 'Content 2', authorId: user.id }
      });

      const result = await getAllForums({}, user.id);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe(post2.id); // Descending order
      expect(result[0].title).toBe('Second Post');
      expect(result[0].author.id).toBe(user.id);
      expect(result[1].id).toBe(post1.id);
    });
  });

  describe('createForumPost', () => {
    it('rejects if user is not authenticated', async () => {
      await expect(createForumPost({ title: 'Title', content: 'Content' }, undefined)).rejects.toMatchObject({
        status: 401,
        payload: { error: 'User must be authenticated' }
      });
    });

    it('rejects if title or content is missing', async () => {
      await expect(createForumPost({ title: '' }, user.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Missing title or content' }
      });

      await expect(createForumPost({ content: '' }, user.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Missing title or content' }
      });
    });

    it('creates a forum post successfully and trims input', async () => {
      const result = await createForumPost({ title: '  Clean Title  ', content: ' Clean Content ' }, user.id);
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Clean Title');
      expect(result.content).toBe('Clean Content');
      expect(result.authorId).toBe(user.id);
      expect(result.author.email).toBe(user.email);
    });
  });

  describe('createComment', () => {
    let post;

    beforeEach(async () => {
      post = await prisma.forumPost.create({
        data: { title: 'Test Post', content: 'Content', authorId: user.id }
      });
    });

    it('rejects if user is not authenticated', async () => {
      await expect(createComment({ id: post.id, content: 'Comment' }, undefined)).rejects.toMatchObject({
        status: 401,
        payload: { error: 'User must be authenticated' }
      });
    });

    it('rejects if comment content is missing', async () => {
      await expect(createComment({ id: post.id, content: '' }, user.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Missing comment content' }
      });
    });

    it('rejects if post id is missing or invalid (non-numeric)', async () => {
      await expect(createComment({ content: 'Comment' }, user.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid post id' }
      });

      await expect(createComment({ id: 'abc', content: 'Comment' }, user.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid post id' }
      });
    });

    it('creates a forum comment successfully with parentId and repliedToName', async () => {
      const comment1 = await createComment({
        id: String(post.id),
        content: 'Root Comment'
      }, user.id);

      expect(comment1.id).toBeDefined();
      expect(comment1.content).toBe('Root Comment');
      expect(comment1.postId).toBe(post.id);
      expect(comment1.parentId).toBeNull();
      expect(comment1.repliedToName).toBeNull();

      const comment2 = await createComment({
        id: String(post.id),
        content: 'Reply Comment',
        parentId: comment1.id,
        repliedToName: 'Original Poster'
      }, user.id);

      expect(comment2.id).toBeDefined();
      expect(comment2.content).toBe('Reply Comment');
      expect(comment2.postId).toBe(post.id);
      expect(comment2.parentId).toBe(comment1.id);
      expect(comment2.repliedToName).toBe('Original Poster');
    });
  });

  describe('getSpecificComments', () => {
    let post;

    beforeEach(async () => {
      post = await prisma.forumPost.create({
        data: { title: 'Test Post', content: 'Content', authorId: user.id }
      });
    });

    it('rejects if user is not authenticated', async () => {
      await expect(getSpecificComments({ id: String(post.id) }, undefined)).rejects.toMatchObject({
        status: 401,
        payload: { error: 'User must be authenticated' }
      });
    });

    it('rejects if id is missing', async () => {
      await expect(getSpecificComments({}, user.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Post id is required' }
      });

      await expect(getSpecificComments({ id: '' }, user.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Post id is required' }
      });
    });

    it('rejects if id is non-numeric', async () => {
      await expect(getSpecificComments({ id: 'abc' }, user.id)).rejects.toMatchObject({
        status: 400,
        payload: { error: 'Invalid post id' }
      });
    });

    it('returns all comments for a post in ascending order', async () => {
      const comment1 = await prisma.forumComment.create({
        data: { content: 'First comment', authorId: user.id, postId: post.id }
      });
      const comment2 = await prisma.forumComment.create({
        data: { content: 'Second comment', authorId: user.id, postId: post.id }
      });

      const result = await getSpecificComments({ id: String(post.id) }, user.id);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe(comment1.id); // Ascending order
      expect(result[0].content).toBe('First comment');
      expect(result[1].id).toBe(comment2.id);
    });
  });
});
