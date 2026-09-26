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

// CORS configuration with credentials support for HTTP-Only cookies
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
