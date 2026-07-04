import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const { registerUser, loginUser, getCurrentUserInfo, requestPasswordChange, resetPasswordWithToken } = await import('../modules/auth/auth.service');

describe('auth service', () => {
  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.CLIENT_BASE_URL = 'http://localhost:5173';

    await prisma.$transaction([
      prisma.translation.deleteMany(),
      prisma.session.deleteMany(),
      prisma.pushSubscription.deleteMany(),
      prisma.forumComment.deleteMany(),
      prisma.forumPost.deleteMany(),
      prisma.user.deleteMany()
    ]);
  });

  it('registers a valid imam user and hashes the password', async () => {
    const result = await registerUser({
      name: 'Test Imam',
      email: 'IMAM@example.com',
      password: 'StrongP@ss1',
      role: 'imam'
    });

    expect(result.email).toBe('imam@example.com');
    expect(result.role).toBe('imam');

    const storedUser = await prisma.user.findUnique({ where: { email: 'imam@example.com' } });
    expect(storedUser).toBeTruthy();
    expect(await bcrypt.compare('StrongP@ss1', storedUser.password)).toBe(true);
  });

  it('rejects a weak password on registration', async () => {
    await expect(registerUser({
      name: 'Test User',
      email: 'user@example.com',
      password: 'weak',
      role: 'listener'
    })).rejects.toMatchObject({
      status: 400,
      payload: { error: expect.stringContaining('Password must be') }
    });
  });

  it('rejects an already registered email', async () => {
    await prisma.user.create({
      data: {
        name: 'Existing User',
        email: 'user@example.com',
        password: 'hashed-password',
        role: 'listener'
      }
    });

    await expect(registerUser({
      name: 'Test User',
      email: 'user@example.com',
      password: 'StrongP@ss1',
      role: 'listener'
    })).rejects.toMatchObject({
      status: 409,
      payload: { error: 'Email already registered' }
    });
  });

  it('logs in a user when credentials are valid', async () => {
    const hashedPassword = await bcrypt.hash('StrongP@ss1', 10);
    await prisma.user.create({
      data: {
        name: 'Listener',
        email: 'listener@example.com',
        password: hashedPassword,
        role: 'listener'
      }
    });

    const result = await loginUser({
      email: 'listener@example.com',
      password: 'StrongP@ss1'
    });

    expect(result.email).toBe('listener@example.com');
  });

  it('rejects invalid login credentials with a 401 status', async () => {
    await prisma.user.create({
      data: {
        name: 'Listener',
        email: 'listener@example.com',
        password: await bcrypt.hash('CorrectP@ss1', 10),
        role: 'listener'
      }
    });

    await expect(loginUser({
      email: 'listener@example.com',
      password: 'WrongP@ss1'
    })).rejects.toMatchObject({
      status: 401,
      payload: { error: 'Invalid email or password' }
    });
  });

  it('returns the current authenticated user profile', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Current User',
        email: 'current@example.com',
        password: 'hashed-password',
        role: 'listener'
      }
    });

    const result = await getCurrentUserInfo({}, user.id);

    expect(result.email).toBe('current@example.com');
  });

  it('requires an authenticated user id for profile lookups', async () => {
    await expect(getCurrentUserInfo({}, undefined)).rejects.toMatchObject({
      status: 401,
      payload: { error: 'User must be authenticated' }
    });
  });

  it('builds a password reset link for the current user', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Reset User',
        email: 'reset@example.com',
        password: 'hashed-password',
        role: 'listener'
      }
    });

    const result = await requestPasswordChange({}, user.id);

    expect(result.resetUrl).toContain('/settings?token=');
    const decoded = jwt.decode(result.resetUrl.split('token=')[1]);
    expect(decoded).toMatchObject({ userId: user.id });
  });

  it('updates a password when the reset token is valid', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Reset User',
        email: 'reset2@example.com',
        password: 'old-hash',
        role: 'listener'
      }
    });
    const secret = process.env.JWT_SECRET + user.password;
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '15m' });

    const result = await resetPasswordWithToken({ token, newPassword: 'StrongP@ss1' }, user.id);

    expect(result.message).toBe('Password updated successfully');

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await bcrypt.compare('StrongP@ss1', updatedUser.password)).toBe(true);
  });
});
