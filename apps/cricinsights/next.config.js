//@ts-check
const path = require('path');

const workspaceRoot = path.join(__dirname, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@cricket-ai/database',
    '@cricket-ai/mcp-server',
    '@cricket-ai/smart-router',
    '@cricket-ai/ai-agent',
  ],
  serverExternalPackages: ['pg'],
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      '@cricket-ai/database': './libs/database/dist/index.js',
      '@cricket-ai/mcp-server': './libs/mcp-server/dist/index.js',
      '@cricket-ai/smart-router': './libs/smart-router/dist/index.js',
      '@cricket-ai/ai-agent': './libs/ai-agent/dist/index.js',
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@cricket-ai/database': path.join(
        workspaceRoot,
        'libs/database/dist/index.js',
      ),
      '@cricket-ai/mcp-server': path.join(
        workspaceRoot,
        'libs/mcp-server/dist/index.js',
      ),
      '@cricket-ai/smart-router': path.join(
        workspaceRoot,
        'libs/smart-router/dist/index.js',
      ),
      '@cricket-ai/ai-agent': path.join(
        workspaceRoot,
        'libs/ai-agent/dist/index.js',
      ),
    };
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

module.exports = nextConfig;
