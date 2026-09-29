import app from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/db.js';

/**
 * Server Bootstrap and Lifecycle Management
 * 
 * Verifies MySQL connection via Prisma before listening on configured port.
 * Registers SIGINT and SIGTERM handlers for graceful shutdown and DB disconnection.
 */
const PORT = process.env.PORT || config.port || 5000;

const connectWithRetry = async (retries = 5, delay = 4000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log('✅ Connected to MySQL database via Prisma ORM.');
      return true;
    } catch (err) {
      console.error(`⚠️ Database connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error('❌ Could not connect to database after all retries.');
        console.error('👉 Action Required: Verify DATABASE_URL in your cloud deployment environment settings.');
      }
    }
  }
  return false;
};

const startServer = async () => {
  // Bind HTTP server first so Render detects open port immediately
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SSISM IMS Server running in ${config.nodeEnv} mode on port ${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
  });

  // Attempt database connection with retries
  connectWithRetry();

  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Closed DB connection and exited server.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
