import Redis from 'ioredis';
import {
  buildRedisClientOptions,
  resolveRedisConnection,
} from './runtime-connections.config';

const redisConnection = resolveRedisConnection(process.env);

export const redisClient = redisConnection.url
  ? new Redis(redisConnection.url, buildRedisClientOptions())
  : new Redis({
      ...(redisConnection.socket || {
        host: 'localhost',
        port: 6379,
      }),
      ...buildRedisClientOptions(),
    });

redisClient.on('connect', () => console.log('Redis connected'));
redisClient.on('error', (err) => console.error('Redis error:', err));

export default redisClient;
