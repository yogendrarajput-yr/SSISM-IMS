import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { logAudit } from './audit.service.js';

/**
 * Generate Access and Refresh JWT tokens for authenticated user.
 * 
 * @param {Object} user - User record from database
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  });

  return { accessToken, refreshToken };
};

/**
 * Verify credentials, generate JWT tokens, record login audit event, and return sanitized profile.
 * 
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @param {string} credentials.ipAddress
 */
export const loginUser = async ({ email, password, ipAddress }) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  const tokens = generateTokens(user);

  await logAudit({
    actorId: user.id,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user.id,
    details: { role: user.role, email: user.email },
    ipAddress,
  });

  // Exclude password hash from returned object
  const { passwordHash, ...sanitizedUser } = user;
  return { user: sanitizedUser, tokens };
};

/**
 * Verify refresh token and issue new token pair.
 * 
 * @param {string} refreshToken
 */
export const refreshAccessToken = async (refreshToken) => {

  if (!refreshToken) {
    throw new AppError('Refresh token required.', 401);
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('User inactive or invalid.', 401);
    }

    const tokens = generateTokens(user);
    const { passwordHash, ...sanitizedUser } = user;

    return { user: sanitizedUser, tokens };
  } catch (err) {
    throw new AppError('Invalid or expired refresh token. Please login again.', 401);
  }
};
