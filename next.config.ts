import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  poweredByHeader: false,
  reactCompiler: true,

  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
    agentUpgrade: "security",
  },
};

export default nextConfig;
