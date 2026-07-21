import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import pg from 'pg';
import {
  databaseUrlFromEnv,
  readDatabaseUrlFromEnv,
  redactDatabaseUrl,
} from './env.js';
import { buildPoolConfig, connectionNeedsSsl } from './ssl.js';

const secrets = new SecretsManagerClient({});

let writePool: pg.Pool | undefined;
let readPool: pg.Pool | undefined;

async function resolveWriteDatabaseUrl(): Promise<string> {
  const directUrl = process.env.DATABASE_URL;
  if (directUrl) {
    return directUrl;
  }

  const secretArn = process.env.DATABASE_SECRET_ARN;
  const host = process.env.DATABASE_HOST;
  const databaseName = process.env.DATABASE_NAME;
  const port = process.env.DATABASE_PORT ?? '5432';

  if (secretArn && host && databaseName) {
    const username = process.env.DATABASE_USER;
    const password = process.env.DATABASE_PASSWORD;

    if (username && password) {
      return `postgresql://${username}:${password}@${host}:${port}/${databaseName}`;
    }

    const response = await secrets.send(
      new GetSecretValueCommand({ SecretId: secretArn }),
    );
    if (!response.SecretString) {
      throw new Error(`Secret ${secretArn} has no SecretString`);
    }

    const creds = JSON.parse(response.SecretString) as {
      username: string;
      password: string;
    };

    return `postgresql://${creds.username}:${creds.password}@${host}:${port}/${databaseName}`;
  }

  return databaseUrlFromEnv();
}

function resolveReadDatabaseUrl(): string {
  return readDatabaseUrlFromEnv();
}

function logPoolTarget(kind: 'read' | 'write', url: string): void {
  const source =
    kind === 'read' && process.env.REMOTE_DATABASE_URL?.trim()
      ? 'REMOTE_DATABASE_URL'
      : 'DATABASE_URL';
  const sslNote = connectionNeedsSsl(url) ? ', ssl=verify (RDS CA)' : '';
  console.log(
    `[database] ${kind} pool → ${redactDatabaseUrl(url)} (via ${source}${sslNote})`,
  );
}

/** Write-capable pool (local Docker, Aurora writer, waitlist, migrations). */
export async function getPool(): Promise<pg.Pool> {
  if (writePool) {
    return writePool;
  }

  const connectionString = await resolveWriteDatabaseUrl();
  logPoolTarget('write', connectionString);
  writePool = new pg.Pool(buildPoolConfig(connectionString));
  return writePool;
}

/**
 * Read-only pool for cricket queries (MCP tools, Fast Path API, AI agent).
 * Uses REMOTE_DATABASE_URL when configured, otherwise falls back to DATABASE_URL.
 */
export async function getReadPool(): Promise<pg.Pool> {
  if (readPool) {
    return readPool;
  }

  const connectionString = resolveReadDatabaseUrl();
  logPoolTarget('read', connectionString);
  readPool = new pg.Pool(buildPoolConfig(connectionString));
  return readPool;
}

export async function closePool(): Promise<void> {
  if (writePool) {
    await writePool.end();
    writePool = undefined;
  }
  if (readPool) {
    await readPool.end();
    readPool = undefined;
  }
}
