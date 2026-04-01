import 'dotenv/config.js';
import Fastify from 'fastify';
import { logger } from './services/logger.js';
import { checkRedisHealth } from './services/redis.js';
import { checkOpenRouterHealth } from './services/openrouter.js';
import { supabase } from './services/supabase.js';
import sandboxRoutes from './routes/sandbox.js';

const app = Fastify({
  logger: false, // Disable Fastify's built-in logger, we use pino directly
});

// Health check endpoint
app.get('/health', async (request, reply) => {
  try {
    // Quick check - just ping the logger
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  } catch (err) {
    logger.error({ err }, 'Health check failed');
    reply.code(503);
    return { status: 'error', error: 'Service unavailable' };
  }
});

// Detailed health check (for monitoring)
app.get('/health/detailed', async (request, reply) => {
  try {
    const redisOk = await checkRedisHealth();
    const openrouterOk = await checkOpenRouterHealth();
    const supabaseOk = await supabase.auth.getSession().then(() => true).catch(() => false);

    if (!redisOk || !openrouterOk || !supabaseOk) {
      reply.code(503);
    }

    return {
      status: redisOk && openrouterOk && supabaseOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        redis: redisOk ? 'ok' : 'error',
        openrouter: openrouterOk ? 'ok' : 'error',
        supabase: supabaseOk ? 'ok' : 'error',
      },
    };
  } catch (err) {
    logger.error({ err }, 'Detailed health check failed');
    reply.code(503);
    return { status: 'error', error: 'Service unavailable' };
  }
});

// Register routes
app.register(sandboxRoutes, { prefix: '/api/sandbox' });

// Global error handler
app.setErrorHandler(async (error, request, reply) => {
  logger.error(
    { err: error, url: request.url, method: request.method },
    'Unhandled error'
  );

  reply.code(500);
  return {
    error: 'Internal server error',
    requestId: request.id,
  };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    logger.info(
      { port, host, env: process.env.NODE_ENV || 'development' },
      '🚀 Agent server running'
    );
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

start();

export default app;
