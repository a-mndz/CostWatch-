import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'node-cron', '@aws-sdk/client-cost-explorer', '@aws-sdk/client-sts', '@google-cloud/bigquery'],
};

export default nextConfig;
