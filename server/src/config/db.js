import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

let prismaInstance;

const dbUrl = process.env.DATABASE_URL || config.databaseUrl;

if (config.nodeEnv === 'production') {
  prismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      log: ['error', 'warn'],
    });
  }
  prismaInstance = global.__prisma;
}

export const prisma = prismaInstance;
