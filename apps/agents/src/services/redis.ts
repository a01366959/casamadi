import { Redis } from '@upstash/redis';
import { logger } from './logger.js';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis only if credentials are provided
export const redis = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

const DEDUP_TTL = 300; // 5 minutes

/**
 * Check if message was already processed (dedup)
 * Returns true if message is a duplicate
 */
export async function isDuplicateMessage(
  hotel_id: string,
  channel: string,
  channel_message_id: string
): Promise<boolean> {
  if (!redis) {
    logger.warn('Redis not configured, skipping dedup');
    return false;
  }

  try {
    const key = `msg:${hotel_id}:${channel}:${channel_message_id}`;
    const exists = await redis.get(key);

    if (exists) {
      logger.debug({ hotel_id, channel_message_id }, 'Duplicate message detected');
      return true;
    }

    // Mark as processed
    await redis.setex(key, DEDUP_TTL, '1');
    return false;
  } catch (err) {
    logger.error({ hotel_id, channel, channel_message_id, err }, 'Dedup check failed');
    // Fail open - don't block on Redis errors
    return false;
  }
}

/**
 * Queue a message for async processing
 */
export async function queueMessage(
  hotel_id: string,
  conversation_id: string,
  message: Record<string, any>
) {
  if (!redis) {
    logger.warn('Redis not configured, skipping queue');
    return;
  }

  try {
    const queue = `queue:${hotel_id}:messages`;
    await redis.lpush(queue, JSON.stringify({ conversation_id, message }));
  } catch (err) {
    logger.error({ hotel_id, conversation_id, err }, 'Failed to queue message');
    // Don't throw, just log
  }
}

/**
 * Health check for Redis
 */
export async function checkRedisHealth(): Promise<boolean> {
  if (!redis) {
    return true; // Optional dependency
  }

  try {
    await redis.ping();
    return true;
  } catch (err) {
    logger.error({ err }, 'Redis health check failed');
    return false;
  }
}
