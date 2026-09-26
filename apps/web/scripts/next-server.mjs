import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const command = process.argv[2];
if (command !== "dev" && command !== "start") {
  throw new Error("Expected dev or start");
}

const port = Number(process.env.PORT ?? "3000");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer from 1 to 65535");
}

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, command, "-H", process.env.HOST || "0.0.0.0", "-p", String(port)], {
  stdio: "inherit",
  env: process.env,
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
