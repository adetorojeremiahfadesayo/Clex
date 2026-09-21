import nextConfig from "eslint-config-next";
import nextTs from "eslint-config-next/typescript";

const config = [...nextConfig, ...nextTs, { ignores: [".next/**", "next-env.d.ts"] }];

export default config;
