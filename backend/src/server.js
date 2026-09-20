import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma, disconnectPrisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`EaseAT API listening on http://localhost:${env.port}`);
  console.log(`AI features: ${env.ai.enabled ? 'on' : 'off'} | storage: ${env.storage.driver}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Fail loudly at boot if the database is unreachable.
prisma.$connect().catch((err) => {
  console.error('Database connection failed:', err.message);
  process.exit(1);
});
