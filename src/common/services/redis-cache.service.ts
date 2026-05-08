import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis;

  constructor() {
    this.redis = createRedisClient();

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err.message);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async storeOtp(email: string, otp: string, ttlSeconds: number = 300): Promise<void> {
    await this.set(`otp:${email}`, otp, ttlSeconds);
  }

  async getOtp(email: string): Promise<string | null> {
    return this.get(`otp:${email}`);
  }

  async deleteOtp(email: string): Promise<void> {
    await this.del(`otp:${email}`);
  }

  async storeSession(sessionId: string, userData: any, ttlSeconds: number = 86400): Promise<void> {
    await this.setJson(`session:${sessionId}`, userData, ttlSeconds);
  }

  async getSession(sessionId: string): Promise<any | null> {
    return this.getJson(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  async cacheApiResponse(cacheKey: string, data: any, ttlSeconds: number = 300): Promise<void> {
    await this.setJson(`api:${cacheKey}`, data, ttlSeconds);
  }

  async getCachedApiResponse(cacheKey: string): Promise<any | null> {
    return this.getJson(`api:${cacheKey}`);
  }

  async invalidateCache(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

function createRedisClient() {
  const redisUrl =
    process.env.REDIS_URL ||
    process.env.REDIS_PRIVATE_URL ||
    process.env.REDIS_PUBLIC_URL;

  const commonOptions = {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  };

  if (redisUrl) {
    return new Redis(redisUrl, commonOptions);
  }

  return new Redis({
    host: process.env.REDIS_HOST || process.env.REDISHOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379', 10),
    username: process.env.REDIS_USERNAME || process.env.REDISUSER || undefined,
    password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined,
    ...commonOptions,
  });
}
