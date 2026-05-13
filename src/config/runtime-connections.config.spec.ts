import {
  isRailwayInternalHost,
  isRunningOnRailway,
  resolveDatabaseConnection,
  resolveRedisConnection,
  shouldAllowInMemoryRedisFallback,
} from './runtime-connections.config';

describe('runtime connections config', () => {
  it('detects Railway runtime correctly', () => {
    expect(isRunningOnRailway({} as NodeJS.ProcessEnv)).toBe(false);
    expect(
      isRunningOnRailway({
        RAILWAY_PROJECT_ID: 'project-id',
      } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it('detects Railway internal hosts', () => {
    expect(isRailwayInternalHost('postgres.railway.internal')).toBe(true);
    expect(isRailwayInternalHost('localhost')).toBe(false);
  });

  it('prefers public database URLs outside Railway when DATABASE_URL is private', () => {
    const resolved = resolveDatabaseConnection({
      DATABASE_PUBLIC_URL: 'postgresql://public.example.com:5432/app',
      DATABASE_URL: 'postgresql://postgres.railway.internal:5432/app',
    } as NodeJS.ProcessEnv);

    expect(resolved.url).toBe('postgresql://public.example.com:5432/app');
    expect(resolved.source).toBe('DATABASE_PUBLIC_URL');
    expect(resolved.requiresPublicNetwork).toBe(false);
  });

  it('keeps private database URLs on Railway', () => {
    const resolved = resolveDatabaseConnection({
      DATABASE_URL: 'postgresql://postgres.railway.internal:5432/app',
      RAILWAY_PROJECT_ID: 'project-id',
    } as NodeJS.ProcessEnv);

    expect(resolved.url).toBe(
      'postgresql://postgres.railway.internal:5432/app',
    );
    expect(resolved.requiresPublicNetwork).toBe(false);
  });

  it('marks local Railway-private database URLs as unusable without fallback', () => {
    const resolved = resolveDatabaseConnection({
      DATABASE_URL: 'postgresql://postgres.railway.internal:5432/app',
    } as NodeJS.ProcessEnv);

    expect(resolved.requiresPublicNetwork).toBe(true);
    expect(resolved.warning).toContain('DATABASE_PUBLIC_URL');
  });

  it('prefers public redis URLs outside Railway when REDIS_URL is private', () => {
    const resolved = resolveRedisConnection({
      REDIS_PUBLIC_URL: 'redis://default:password@public.example.com:6379',
      REDIS_URL: 'redis://default:password@redis.railway.internal:6379',
    } as NodeJS.ProcessEnv);

    expect(resolved.url).toBe(
      'redis://default:password@public.example.com:6379',
    );
    expect(resolved.source).toBe('REDIS_PUBLIC_URL');
    expect(resolved.requiresPublicNetwork).toBe(false);
  });

  it('marks private redis hosts as unusable locally without fallback', () => {
    const resolved = resolveRedisConnection({
      REDISHOST: 'redis.railway.internal',
      REDISPORT: '6379',
    } as NodeJS.ProcessEnv);

    expect(resolved.requiresPublicNetwork).toBe(true);
    expect(resolved.warning).toContain('REDIS_PUBLIC_URL');
  });

  it('allows in-memory redis fallback outside production by default', () => {
    expect(
      shouldAllowInMemoryRedisFallback({
        NODE_ENV: 'development',
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      shouldAllowInMemoryRedisFallback({
        NODE_ENV: 'production',
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      shouldAllowInMemoryRedisFallback({
        NODE_ENV: 'development',
        REDIS_MEMORY_FALLBACK: 'false',
      } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});
