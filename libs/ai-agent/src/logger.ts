type LogLevel = 'DEBUG' | 'INFO' | 'STEP' | 'WARN' | 'ERROR';

const LOG_PREFIX = 'CricInsights AI';

function timestamp(): string {
  return new Date().toISOString();
}

function isDebugEnabled(): boolean {
  const flag = process.env.AI_AGENT_DEBUG?.trim().toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

function isLoggingEnabled(): boolean {
  const flag = process.env.AI_AGENT_LOG?.trim().toLowerCase();
  return flag !== 'false' && flag !== '0' && flag !== 'no';
}

function formatLine(level: LogLevel, message: string): string {
  return `${timestamp()} | ${LOG_PREFIX} | ${level.padEnd(5)} | ${message}`;
}

function write(level: LogLevel, message: string): void {
  if (!isLoggingEnabled()) {
    return;
  }

  const line = formatLine(level, message);
  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function summarizeJson(value: unknown, maxLength = 240): string {
  try {
    const text = JSON.stringify(value);
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength)}…`;
  } catch {
    return String(value);
  }
}

/** Structured logger for the AI agent pipeline (stderr for errors). */
export const agentLog = {
  debug(message: string): void {
    if (isDebugEnabled()) {
      write('DEBUG', message);
    }
  },

  info(message: string): void {
    write('INFO', message);
  },

  step(message: string): void {
    write('STEP', message);
  },

  warn(message: string): void {
    write('WARN', message);
  },

  error(message: string, error?: unknown): void {
    if (error instanceof Error) {
      write('ERROR', `${message} — ${error.message}`);
      if (isDebugEnabled() && error.stack) {
        write('DEBUG', error.stack);
      }
      return;
    }
    if (error !== undefined) {
      write('ERROR', `${message} — ${summarizeJson(error)}`);
      return;
    }
    write('ERROR', message);
  },

  summarizeJson,
};
