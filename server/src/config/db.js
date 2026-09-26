import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

let prismaInstance;

if (config.nodeEnv === 'production') {
  prismaInstance = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prismaInstance = global.__prisma;
}

export const prisma = prismaInstance;
