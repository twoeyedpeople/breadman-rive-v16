/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Transpile the SDK package to ensure proper handling
  transpilePackages: ['@mascotbot-sdk/react'],
  experimental: {
    // Prevent optimization issues with pre-minified/obfuscated packages
    optimizePackageImports: [],
  },
};

module.exports = nextConfig;
