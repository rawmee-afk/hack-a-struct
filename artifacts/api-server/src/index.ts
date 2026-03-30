import { spawn, spawnSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import app from "./app";
import { logger } from "./lib/logger";

function findBackendDir(): string {
  const candidates = [
    // production: cwd is workspace root
    path.resolve(process.cwd(), "artifacts/structural-ai-backend"),
    // development: cwd is artifacts/api-server
    path.resolve(process.cwd(), "../../artifacts/structural-ai-backend"),
    path.resolve(process.cwd(), "../structural-ai-backend"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function launchPythonBackend(): void {
  const backendDir = findBackendDir();
  logger.info({ dir: backendDir }, "Starting Python backend…");

  // Install deps first (synchronous, no shell needed)
  const install = spawnSync(
    "python3",
    ["-m", "pip", "install", "-q", "-r", "requirements.txt"],
    { cwd: backendDir, env: { ...process.env }, encoding: "utf8" },
  );

  if (install.status !== 0) {
    logger.warn({ stderr: install.stderr?.slice(0, 400) }, "pip install warnings");
  } else {
    logger.info("Python deps ready");
  }

  // Start uvicorn directly via python3
  const proc = spawn("python3", ["-u", "main.py"], {
    cwd: backendDir,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
    stdio: "inherit",
  });

  proc.on("error", (err) => {
    logger.error({ err }, "Failed to spawn Python backend");
  });

  proc.on("exit", (code, signal) => {
    logger.error({ code, signal }, "Python backend exited — restarting in 5 s");
    setTimeout(launchPythonBackend, 5_000);
  });

  logger.info({ pid: proc.pid }, "Python backend process launched");
}

// Only spawn the Python backend in production.
// In development the dedicated workflow handles it.
if (process.env["NODE_ENV"] === "production") {
  launchPythonBackend();
}

// ── Start Express server ──────────────────────────────────────────────────────
const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
