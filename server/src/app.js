import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { AppError } from './utils/appError.js';

/**
 * Express Application Configuration for SSISM IMS
 * 
 * Features:
 * - Helmet security headers
 * - CORS with credential support for HTTP-Only cookies
 * - Rate limiting to prevent abuse
 * - JSON and URL-encoded body parsing (10MB limit for bulk operations)
 * - Centralized route mounting and error handling
 */
const app = express();


// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// CORS configuration with dynamic origin support (localhost, Vercel, Render) and credentials
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Allow any localhost or 127.0.0.1 port (5173, 3000, 4173, etc.)
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      // Allow any Vercel domain (*.vercel.app)
      const isVercel = /^https?:\/\/([a-zA-Z0-9-]+\.)*vercel\.app$/.test(origin);

      // Allow Render or explicitly configured client domains
      const isExplicitlyAllowed = allowedOrigins.some(
        (allowed) => allowed && origin === allowed.replace(/\/+$/, '')
      );

      if (isLocalhost || isVercel || isExplicitlyAllowed || origin.endsWith('.onrender.com')) {
        return callback(null, true);
      }

      // Permissive fallback for production while preserving credentials
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// Body and Cookie Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate Limiter
app.use('/api', apiRateLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'SSISM IMS Backend API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount Main API routes
app.use('/api', routes);

// Handle undefined routes
app.use((req, res, next) => {
  next(new AppError(`Cannot find route ${req.originalUrl} on this server`, 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
