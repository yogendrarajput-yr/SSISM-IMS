import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';

/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens provided via Authorization Bearer headers or HTTP-Only cookies.
 * Loads authenticated user profile and verifies active account status.
 */
export const authenticate = async (req, res, next) => {

  try {
    let token = null;

    // Check authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Fallback to HTTP-only cookie
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('You are not authenticated. Please log in.', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return next(new AppError('User account no longer exists or is disabled.', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
