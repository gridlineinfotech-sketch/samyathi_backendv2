const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

export function splitOrigins(...values: Array<string | undefined>): string[] {
  return [
    ...new Set(
      values
        .flatMap((value) => value?.split(',') ?? [])
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean),
    ),
  ];
}

export function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    return (
      LOCALHOST_HOSTS.has(url.hostname) || url.hostname.endsWith('.localhost')
    );
  } catch {
    return false;
  }
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  env: NodeJS.ProcessEnv,
): boolean {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const configuredOrigins = splitOrigins(env.CORS_ORIGINS, env.FRONTEND_URL);

  return (
    configuredOrigins.includes(normalizedOrigin) ||
    isLocalDevelopmentOrigin(normalizedOrigin)
  );
}

export function buildCorsOptions(env: NodeJS.ProcessEnv) {
  return {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      callback(null, isAllowedCorsOrigin(origin, env));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
    optionsSuccessStatus: 204,
    preflightContinue: false,
  };
}

export function shouldSkipRateLimit(method: string): boolean {
  return method.toUpperCase() === 'OPTIONS';
}

export function resolveTrustProxy(value?: string): boolean | number | string {
  if (!value || value === 'true') {
    return 1;
  }

  if (value === 'false') {
    return false;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? value : parsedValue;
}
