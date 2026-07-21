#!/usr/bin/env node
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { createMcpServer, MCP_SERVER_NAME } from './server.js';

const DEFAULT_PORT = 3000;
const MCP_PATH = process.env.MCP_HTTP_PATH?.trim() || '/mcp';

type McpHttpRequest = IncomingMessage & { body?: unknown };
type McpHttpResponse = ServerResponse & {
  json(body: unknown): void;
  status(code: number): McpHttpResponse;
};

function readPort(): number {
  const raw = process.env.PORT?.trim();
  if (!raw) {
    return DEFAULT_PORT;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }

  return port;
}

function jsonRpcMethodNotAllowed(message: string) {
  return {
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message,
    },
    id: null,
  };
}

export async function startHttpMcpServer(): Promise<void> {
  const app = createMcpExpressApp();
  const port = readPort();

  app.get('/healthz', (_req: McpHttpRequest, res: McpHttpResponse) => {
    res.json({
      ok: true,
      service: MCP_SERVER_NAME,
      transport: 'streamable-http',
      mcpPath: MCP_PATH,
    });
  });

  app.post(MCP_PATH, async (req: McpHttpRequest, res: McpHttpResponse) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('[mcp-http] request failed:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    } finally {
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
    }
  });

  app.get(MCP_PATH, (_req: McpHttpRequest, res: McpHttpResponse) => {
    res.status(405).json(jsonRpcMethodNotAllowed('Method not allowed.'));
  });

  app.delete(MCP_PATH, (_req: McpHttpRequest, res: McpHttpResponse) => {
    res.status(405).json(jsonRpcMethodNotAllowed('Method not allowed.'));
  });

  app.listen(port, '0.0.0.0', (error?: Error) => {
    if (error) {
      console.error('[mcp-http] failed to start:', error);
      process.exit(1);
    }

    console.log(
      `[mcp-http] ${MCP_SERVER_NAME} listening on 0.0.0.0:${port}${MCP_PATH}`,
    );
  });
}

const entryPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedPath === entryPath) {
  startHttpMcpServer().catch((error) => {
    console.error('[mcp-http] failed to start:', error);
    process.exit(1);
  });
}
