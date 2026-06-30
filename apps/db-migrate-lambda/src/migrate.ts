import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const secrets = new SecretsManagerClient({});
const FLYWAY_BIN = process.env.FLYWAY_BIN ?? '/opt/flyway/flyway';
const FLYWAY_SQL_LOCATIONS =
  process.env.FLYWAY_SQL_LOCATIONS ?? 'filesystem:/sql/db';

async function resolveCredentials(): Promise<{
  username: string;
  password: string;
}> {
  const username = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  const secretArn = process.env.DATABASE_SECRET_ARN;

  if (username && password) {
    return { username, password };
  }

  if (!secretArn) {
    throw new Error(
      'Set DATABASE_USER and DATABASE_PASSWORD for local runs, or DATABASE_SECRET_ARN for AWS',
    );
  }

  const response = await secrets.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  if (!response.SecretString) {
    throw new Error(`Secret ${secretArn} has no SecretString`);
  }

  return JSON.parse(response.SecretString) as {
    username: string;
    password: string;
  };
}

export async function runFlywayMigrate(): Promise<void> {
  const host = process.env.DATABASE_HOST;
  const databaseName = process.env.DATABASE_NAME;
  const port = process.env.DATABASE_PORT ?? '5432';

  if (!host || !databaseName) {
    throw new Error('DATABASE_HOST and DATABASE_NAME are required');
  }

  const { username, password } = await resolveCredentials();

  const confPath = '/tmp/flyway.conf';
  const conf = [
    `flyway.url=jdbc:postgresql://${host}:${port}/${databaseName}`,
    `flyway.user=${username}`,
    `flyway.password=${password}`,
    `flyway.locations=${FLYWAY_SQL_LOCATIONS}`,
  ].join('\n');

  writeFileSync(confPath, conf, 'utf8');

  execSync(`${FLYWAY_BIN} -configFiles=${confPath} migrate`, {
    stdio: 'inherit',
    env: process.env,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runMigrations(): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await runFlywayMigrate();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 5) {
        console.warn(`Flyway attempt ${attempt} failed, retrying…`, error);
        await sleep(attempt * 10_000);
      }
    }
  }

  throw lastError;
}
