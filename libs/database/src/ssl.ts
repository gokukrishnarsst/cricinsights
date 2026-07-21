import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';

const TLS_SSL_MODES = new Set(['require', 'verify-ca', 'verify-full', 'prefer']);

function parseDatabaseUrl(connectionString: string): URL {
  return new URL(connectionString);
}

/** Whether the connection string targets Aurora/RDS with TLS enabled. */
export function connectionNeedsSsl(connectionString: string): boolean {
  const url = parseDatabaseUrl(connectionString);
  const sslmode = url.searchParams.get('sslmode')?.toLowerCase();

  if (sslmode === 'disable' || sslmode === 'allow') {
    return false;
  }

  if (sslmode && TLS_SSL_MODES.has(sslmode)) {
    return true;
  }

  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return false;
  }

  return host.includes('.rds.amazonaws.com') || host.includes('.rds.');
}

/** Resolve path to the AWS RDS combined CA bundle (bundled with @cricket-ai/database). */
export function resolveRdsCaPath(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env.DATABASE_SSL_CA_PATH?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, '../certs/rds-global-bundle.pem');
}

/** Build pg Pool config with RDS CA verification when connecting to Aurora. */
export function buildPoolConfig(connectionString: string): pg.PoolConfig {
  if (!connectionNeedsSsl(connectionString)) {
    return { connectionString };
  }

  const caPath = resolveRdsCaPath();
  if (!fs.existsSync(caPath)) {
    throw new Error(
      `Database SSL is required but RDS CA bundle not found at ${caPath}. ` +
        'Download https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem ' +
        'to libs/database/certs/rds-global-bundle.pem or set DATABASE_SSL_CA_PATH.',
    );
  }

  const url = parseDatabaseUrl(connectionString);
  const ca = fs.readFileSync(caPath, 'utf8');
  const database = url.pathname.replace(/^\//, '');

  if (!database) {
    throw new Error('Database name is missing from connection string');
  }

  // Use explicit fields so pg-connection-string does not overwrite our ssl.ca.
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl: {
      rejectUnauthorized: true,
      ca,
      servername: url.hostname,
    },
  };
}
