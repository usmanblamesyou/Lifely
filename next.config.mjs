import { fileURLToPath } from 'url';
import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
