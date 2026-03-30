import { spawn } from "child_process";
import * as path from "path";
import app from "./app";
import { logger } from "./lib/logger";

const BACKEND_DIR = path.resolve(process.cwd(), "artifacts/structural-ai-backend");

function launchPythonBackend(): void {
  logger.info({ dir: BACKEND_DIR }, "Starting Python backend…");

  const proc = spawn(
    "bash",
    [
      "-c",
      "python3 -m pip install -q -r requirements.txt && python3 -u main.py",
    ],
    {
      cwd: BACKEND_DIR,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: "inherit",
    },
  );

  proc.on("error", (err) => {
    logger.error({ err }, "Failed to spawn Python backend");
  });

  proc.on("exit", (code, signal) => {
    logger.error({ code, signal }, "Python backend exited — restarting in 5 s");
    setTimeout(launchPythonBackend, 5_000);
  });

  logger.info({ pid: proc.pid }, "Python backend process launched");
}

// ── Launch Python backend (non-blocking) ──────────────────────────────────────
launchPythonBackend();

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
