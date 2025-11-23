/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
      // Suppress pino-pretty optional dependency warnings
      'pino-pretty': false,
    };

    // Ignore specific warnings
    config.ignoreWarnings = [
      { module: /node_modules\/@metamask\/sdk/ },
      { module: /node_modules\/pino/ },
      // Suppress pino-pretty warnings
      /Can't resolve 'pino-pretty'/,
    ];

    // Externalize pino-pretty to prevent bundling issues
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push('pino-pretty');
    }

    return config;
  },
};

module.exports = nextConfig;
