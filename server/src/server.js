import app from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/db.js';

/**
 * Server Bootstrap and Lifecycle Management
 * 
 * Verifies MySQL connection via Prisma before listening on configured port.
 * Registers SIGINT and SIGTERM handlers for graceful shutdown and DB disconnection.
 */
const startServer = async () => {

  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Connected to MySQL database via Prisma ORM.');

    const PORT = process.env.PORT || config.port || 5000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SSISM IMS Server running in ${config.nodeEnv} mode on port ${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
    });

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
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
