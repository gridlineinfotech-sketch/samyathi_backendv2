import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  buildRedisClientOptions,
  resolveRedisConnection,
  shouldAllowInMemoryRedisFallback,
} from '../../config/runtime-connections.config';

type CacheEntry = {
  expiresAt?: number;
  value: string;
};

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly allowMemoryFallback = shouldAllowInMemoryRedisFallback(
    process.env,
  );
  private readonly memoryStore = new Map<string, CacheEntry>();
  private readonly redisConnection = resolveRedisConnection(process.env);
  private connectPromise?: Promise<void>;
  private redis?: Redis;
  private usingMemoryFallback = false;

  constructor() {
    if (this.redisConnection.warning) {
      this.logger.warn(this.redisConnection.warning);
    }

    if (
      this.redisConnection.requiresPublicNetwork &&
      this.allowMemoryFallback
    ) {
      this.enableMemoryFallback(
        this.redisConnection.warning ||
          'Redis private host is not reachable locally.',
      );
      return;
    }

    if (this.redisConnection.url) {
      this.redis = new Redis(
        this.redisConnection.url,
        buildRedisClientOptions(),
      );
    } else if (this.redisConnection.socket) {
      this.redis = new Redis({
        ...this.redisConnection.socket,
        ...buildRedisClientOptions(),
      });
    }

    if (!this.redis) {
      if (this.allowMemoryFallback) {
        this.enableMemoryFallback(
          'Redis is not configured for this environment.',
        );
      }
      return;
    }

    this.redis.on('connect', () => {
      this.logger.log(
        `Redis connected successfully via ${this.redisConnection.source}`,
      );
    });

    this.redis.on('error', (err) => {
      const message = err instanceof Error ? err.message : String(err || '');

      if (this.usingMemoryFallback) {
        return;
      }

      if (
        this.allowMemoryFallback &&
        (!message || isRecoverableRedisConnectionError(message))
      ) {
        this.enableMemoryFallback(message || 'Redis connection unavailable.');
        return;
      }

      this.logger.error('Redis connection error:', message);
    });

    this.connectPromise = this.redis.connect().catch((error) => {
      if (this.allowMemoryFallback) {
        this.enableMemoryFallback(error.message);
        return;
      }

      throw error;
    });
  }

  async get(key: string): Promise<string | null> {
    await this.ensureRedisReady();

    if (this.usingMemoryFallback) {
      return this.getFromMemory(key);
    }

    return this.getRedisClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.ensureRedisReady();

    if (this.usingMemoryFallback) {
      this.setInMemory(key, value, ttlSeconds);
      return;
    }

    const redis = this.getRedisClient();

    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, value);
    } else {
      await redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.ensureRedisReady();

    if (this.usingMemoryFallback) {
      this.memoryStore.delete(key);
      return;
    }

    await this.getRedisClient().del(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async storeOtp(
    email: string,
    otp: string,
    ttlSeconds: number = 300,
  ): Promise<void> {
    await this.set(`otp:${email}`, otp, ttlSeconds);
  }

  async getOtp(email: string): Promise<string | null> {
    return this.get(`otp:${email}`);
  }

  async deleteOtp(email: string): Promise<void> {
    await this.del(`otp:${email}`);
  }

  async storeSession(
    sessionId: string,
    userData: any,
    ttlSeconds: number = 86400,
  ): Promise<void> {
    await this.setJson(`session:${sessionId}`, userData, ttlSeconds);
  }

  async getSession(sessionId: string): Promise<any | null> {
    return this.getJson(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  async cacheApiResponse(
    cacheKey: string,
    data: any,
    ttlSeconds: number = 300,
  ): Promise<void> {
    await this.setJson(`api:${cacheKey}`, data, ttlSeconds);
  }

  async getCachedApiResponse(cacheKey: string): Promise<any | null> {
    return this.getJson(`api:${cacheKey}`);
  }

  async invalidateCache(pattern: string): Promise<void> {
    await this.ensureRedisReady();

    if (this.usingMemoryFallback) {
      const matcher = createGlobMatcher(pattern);

      for (const key of [...this.memoryStore.keys()]) {
        if (matcher.test(key)) {
          this.memoryStore.delete(key);
        }
      }

      return;
    }

    const redis = this.getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  private async ensureRedisReady(): Promise<void> {
    if (this.connectPromise) {
      await this.connectPromise;
    }
  }

  private getRedisClient(): Redis {
    if (!this.redis) {
      throw new Error(
        'Redis client is not initialized. Set REDIS_PUBLIC_URL/REDIS_URL_LOCAL or enable REDIS_MEMORY_FALLBACK for local development.',
      );
    }

    return this.redis;
  }

  private getFromMemory(key: string): string | null {
    const entry = this.memoryStore.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry.value;
  }

  private setInMemory(key: string, value: string, ttlSeconds?: number): void {
    this.memoryStore.set(key, {
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      value,
    });
  }

  private enableMemoryFallback(reason: string): void {
    if (this.usingMemoryFallback) {
      return;
    }

    this.usingMemoryFallback = true;
    this.logger.warn(`Using in-memory cache fallback. ${reason}`);

    if (this.redis) {
      this.redis.removeAllListeners();
      this.redis.disconnect(false);
      this.redis = undefined;
    }
  }
}

function createGlobMatcher(pattern: string): RegExp {
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escapedPattern.replace(/\*/g, '.*')}$`);
}

function isRecoverableRedisConnectionError(message: string): boolean {
  return /(ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|getaddrinfo|connection is closed)/i.test(
    message,
  );
}
