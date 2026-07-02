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
