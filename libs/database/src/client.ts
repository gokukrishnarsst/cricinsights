import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import pg from 'pg';
import { databaseUrlFromEnv } from './env';

const secrets = new SecretsManagerClient({});

let pool: pg.Pool | undefined;

async function resolveDatabaseUrl(): Promise<string> {
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

export async function getPool(): Promise<pg.Pool> {
  if (pool) {
    return pool;
  }

  const connectionString = await resolveDatabaseUrl();
  pool = new pg.Pool({ connectionString });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
