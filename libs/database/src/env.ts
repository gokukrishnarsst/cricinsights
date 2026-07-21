export const DEFAULT_DATABASE_USER = 'cricketadmin';

export function databaseNameForEnv(envName: string): string {
  return `cricket_ai_${envName}`;
}

/** Default local / dev database name (`ENV=dev`). */
export const DATABASE_NAME = databaseNameForEnv('dev');

export function databaseUrlFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DATABASE_URL;
  if (url) {
    return url;
  }

  const host = env.DATABASE_HOST ?? 'localhost';
  const port = env.DATABASE_PORT ?? '5432';
  const name = env.DATABASE_NAME ?? DATABASE_NAME;
  const user = env.DATABASE_USER ?? DEFAULT_DATABASE_USER;
  const password = env.DATABASE_PASSWORD ?? DEFAULT_DATABASE_USER;

  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}

/**
 * Read-only connection string for cricket data queries.
 * Prefers REMOTE_DATABASE_URL (Aurora read user) when set, otherwise DATABASE_URL.
 */
export function readDatabaseUrlFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const remoteUrl = env.REMOTE_DATABASE_URL?.trim();
  if (remoteUrl) {
    return remoteUrl;
  }

  return databaseUrlFromEnv(env);
}

/** Redact password in a connection URL for safe logging. */
export function redactDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '****';
    }
    return parsed.toString();
  } catch {
    return url.replace(/:[^:@/]+@/, ':****@');
  }
}
