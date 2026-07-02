//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cricket-ai/database'],
  serverExternalPackages: ['pg'],
};

module.exports = nextConfig;
