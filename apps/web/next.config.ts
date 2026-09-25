import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["pg", "pdf-parse", "mammoth"],
  transpilePackages: ["@lex/domain", "@lex/db"],
  // Dev resources (HMR, fonts) are blocked for non-localhost origins by default;
  // sandbox previews reach the dev server through 127.0.0.1 and a proxy host.
  allowedDevOrigins: ["127.0.0.1", "0.0.0.0", "*.preview.usehoplite.com", "*.hoplite.sh"],
};

export default nextConfig;
