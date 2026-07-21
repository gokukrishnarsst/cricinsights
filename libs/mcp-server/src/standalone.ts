#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';

/**
 * Start the MCP server on stdio transport (for Bedrock AgentCore / local hosts).
 */
export async function startStdioMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const entryPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : '';
const isDirectRun = invokedPath === entryPath;

if (isDirectRun) {
  startStdioMcpServer().catch((error) => {
    console.error('Failed to start Cricket AI MCP server:', error);
    process.exit(1);
  });
}
