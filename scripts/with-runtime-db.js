const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAILWAY_INTERNAL_SUFFIX = '.railway.internal';
const DATABASE_FALLBACK_KEYS = [
  'DATABASE_URL_LOCAL',
  'DATABASE_PUBLIC_URL',
  'DATABASE_URL_EXTERNAL',
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const result = {};

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    const key = line.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(line.slice(separatorIndex + 1).trim());

    result[key] = value;
  }

  return result;
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getHostnameFromUrl(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
}

function isRunningOnRailway(env) {
  return Boolean(
    env.RAILWAY_PROJECT_ID ||
    env.RAILWAY_ENVIRONMENT_ID ||
    env.RAILWAY_SERVICE_ID ||
    env.RAILWAY_PUBLIC_DOMAIN,
  );
}

function resolveDatabaseUrl(env) {
  const databaseUrl = env.DATABASE_URL;
  const fallbackEntry = DATABASE_FALLBACK_KEYS.find((key) => env[key]);
  const fallbackUrl = fallbackEntry ? env[fallbackEntry] : undefined;

  if (!databaseUrl) {
    return fallbackUrl;
  }

  const hostname = getHostnameFromUrl(databaseUrl);

  if (
    hostname &&
    hostname.endsWith(RAILWAY_INTERNAL_SUFFIX) &&
    !isRunningOnRailway(env) &&
    fallbackUrl
  ) {
    console.log(
      `[with-runtime-db] Using ${fallbackEntry} because DATABASE_URL points to Railway private host ${hostname}.`,
    );
    return fallbackUrl;
  }

  return databaseUrl;
}

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error('Usage: node scripts/with-runtime-db.js <command> [...args]');
  process.exit(1);
}

const envFilePath = path.resolve(process.cwd(), '.env');
const envFromFile = parseEnvFile(envFilePath);
const mergedEnv = {
  ...envFromFile,
  ...process.env,
};
const resolvedDatabaseUrl = resolveDatabaseUrl(mergedEnv);

if (!resolvedDatabaseUrl) {
  console.error(
    '[with-runtime-db] No usable database URL found. Set DATABASE_URL, DATABASE_PUBLIC_URL, or DATABASE_URL_LOCAL.',
  );
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ...envFromFile,
    DATABASE_URL: resolvedDatabaseUrl,
  },
  shell: true,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
