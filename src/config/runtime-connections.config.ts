const RAILWAY_INTERNAL_SUFFIX = '.railway.internal';

type ResolvedEnvValue = {
  key: string;
  value: string;
};

export type ResolvedDatabaseConnection = {
  requiresPublicNetwork: boolean;
  source?: string;
  url?: string;
  warning?: string;
};

export type ResolvedRedisConnection = {
  requiresPublicNetwork: boolean;
  socket?: {
    host: string;
    password?: string;
    port: number;
    username?: string;
  };
  source: string;
  url?: string;
  warning?: string;
};

const DATABASE_FALLBACK_KEYS = [
  'DATABASE_URL_LOCAL',
  'DATABASE_PUBLIC_URL',
  'DATABASE_URL_EXTERNAL',
];

const REDIS_PRIMARY_URL_KEYS = ['REDIS_URL', 'REDIS_PRIVATE_URL'];
const REDIS_FALLBACK_URL_KEYS = ['REDIS_URL_LOCAL', 'REDIS_PUBLIC_URL'];

function firstDefinedEnvValue(
  env: NodeJS.ProcessEnv,
  keys: string[],
): ResolvedEnvValue | undefined {
  for (const key of keys) {
    const value = env[key]?.trim();

    if (value) {
      return { key, value };
    }
  }

  return undefined;
}

function getHostnameFromUrl(value: string): string | undefined {
  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
}

export function isRunningOnRailway(env: NodeJS.ProcessEnv): boolean {
  return Boolean(
    env.RAILWAY_PROJECT_ID ||
    env.RAILWAY_ENVIRONMENT_ID ||
    env.RAILWAY_SERVICE_ID ||
    env.RAILWAY_PUBLIC_DOMAIN,
  );
}

export function isRailwayInternalHost(host?: string): boolean {
  return Boolean(host?.endsWith(RAILWAY_INTERNAL_SUFFIX));
}

export function shouldUseExternalRailwayConnection(
  host: string | undefined,
  env: NodeJS.ProcessEnv,
): boolean {
  return (
    Boolean(host) && isRailwayInternalHost(host) && !isRunningOnRailway(env)
  );
}

export function resolveDatabaseConnection(
  env: NodeJS.ProcessEnv,
): ResolvedDatabaseConnection {
  const primary = firstDefinedEnvValue(env, ['DATABASE_URL']);
  const fallback = firstDefinedEnvValue(env, DATABASE_FALLBACK_KEYS);
  const primaryHost = primary ? getHostnameFromUrl(primary.value) : undefined;

  if (!primary && fallback) {
    return {
      requiresPublicNetwork: false,
      source: fallback.key,
      url: fallback.value,
    };
  }

  if (primary && shouldUseExternalRailwayConnection(primaryHost, env)) {
    if (fallback) {
      return {
        requiresPublicNetwork: false,
        source: fallback.key,
        url: fallback.value,
        warning: `Using ${fallback.key} because DATABASE_URL points to Railway private host ${primaryHost}.`,
      };
    }

    return {
      requiresPublicNetwork: true,
      source: primary.key,
      url: primary.value,
      warning: `DATABASE_URL points to Railway private host ${primaryHost}. Set DATABASE_PUBLIC_URL or DATABASE_URL_LOCAL for local development.`,
    };
  }

  return {
    requiresPublicNetwork: false,
    source: primary?.key,
    url: primary?.value ?? fallback?.value,
  };
}

export function resolveRedisConnection(
  env: NodeJS.ProcessEnv,
): ResolvedRedisConnection {
  const primaryUrl = firstDefinedEnvValue(env, REDIS_PRIMARY_URL_KEYS);
  const fallbackUrl = firstDefinedEnvValue(env, REDIS_FALLBACK_URL_KEYS);
  const primaryHost = primaryUrl
    ? getHostnameFromUrl(primaryUrl.value)
    : undefined;

  if (primaryUrl) {
    if (shouldUseExternalRailwayConnection(primaryHost, env)) {
      if (fallbackUrl) {
        return {
          requiresPublicNetwork: false,
          source: fallbackUrl.key,
          url: fallbackUrl.value,
          warning: `Using ${fallbackUrl.key} because ${primaryUrl.key} points to Railway private host ${primaryHost}.`,
        };
      }

      return {
        requiresPublicNetwork: true,
        source: primaryUrl.key,
        url: primaryUrl.value,
        warning: `${primaryUrl.key} points to Railway private host ${primaryHost}. Set REDIS_PUBLIC_URL or REDIS_URL_LOCAL for local development.`,
      };
    }

    return {
      requiresPublicNetwork: false,
      source: primaryUrl.key,
      url: primaryUrl.value,
    };
  }

  if (fallbackUrl) {
    return {
      requiresPublicNetwork: false,
      source: fallbackUrl.key,
      url: fallbackUrl.value,
    };
  }

  const host = env.REDIS_HOST?.trim() || env.REDISHOST?.trim() || 'localhost';
  const port = parseInt(env.REDIS_PORT || env.REDISPORT || '6379', 10);
  const source =
    env.REDIS_HOST || env.REDISHOST
      ? 'REDIS_HOST/REDIS_PORT'
      : 'localhost defaults';

  if (shouldUseExternalRailwayConnection(host, env)) {
    return {
      requiresPublicNetwork: true,
      socket: {
        host,
        password: env.REDIS_PASSWORD || env.REDISPASSWORD || undefined,
        port,
        username: env.REDIS_USERNAME || env.REDISUSER || undefined,
      },
      source,
      warning: `Redis host ${host} is Railway private networking. Set REDIS_PUBLIC_URL or REDIS_URL_LOCAL for local development.`,
    };
  }

  return {
    requiresPublicNetwork: false,
    socket: {
      host,
      password: env.REDIS_PASSWORD || env.REDISPASSWORD || undefined,
      port,
      username: env.REDIS_USERNAME || env.REDISUSER || undefined,
    },
    source,
  };
}

export function buildRedisClientOptions() {
  return {
    family: 0,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  };
}

export function shouldAllowInMemoryRedisFallback(
  env: NodeJS.ProcessEnv,
): boolean {
  return env.NODE_ENV !== 'production' && env.REDIS_MEMORY_FALLBACK !== 'false';
}
