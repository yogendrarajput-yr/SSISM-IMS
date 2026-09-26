import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

/**
 * Standard API rate limiter to protect against DDoS or brute-force crawling.
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests created from this IP, please try again after 15 minutes.',
  },
});

/**
 * Stricter rate limiter for authentication endpoints (login attempts).
 */
export const authRateLimiter = rateLimit({

  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit login attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});
