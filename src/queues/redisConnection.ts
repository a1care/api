import { Redis } from "ioredis";
import type { Redis as RedisClient } from "ioredis";

let connection: RedisClient | null = null;

export function getQueueRedisConnection(): RedisClient | null {
  if (connection) return connection;

  const host = process.env.REDIS_HOST;
  const username = process.env.REDIS_USERNAME;
  const password = process.env.REDIS_PASSWORD;
  const port = Number(process.env.REDIS_PORT || 6379);

  if (!host || !username || !password) {
    return null;
  }

  connection = new Redis({
    host,
    port,
    username,
    password,
    maxRetriesPerRequest: null
  });

  return connection;
}
