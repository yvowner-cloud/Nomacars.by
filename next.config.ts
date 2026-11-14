import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Самодостаточная сборка для запуска на своём сервере (node server.js)
  output: "standalone",
};

export default nextConfig;
