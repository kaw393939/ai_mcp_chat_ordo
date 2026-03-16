#!/usr/bin/env node
/**
 * Starts `next dev` on the first available port, beginning with PORT
 * from the environment (default 3000). If that port is busy, it tries
 * the next one, up to 10 attempts.
 */
import { createServer } from "net";
import { execFileSync } from "child_process";
import { resolve } from "path";

const PREFERRED = parseInt(process.env.PORT || "3000", 10);
const MAX_ATTEMPTS = 10;

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, "0.0.0.0");
  });
}

async function findFreePort(start) {
  for (let port = start; port < start + MAX_ATTEMPTS; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(
    `No free port found in range ${start}–${start + MAX_ATTEMPTS - 1}`,
  );
}

const port = await findFreePort(PREFERRED);
if (port !== PREFERRED) {
  console.log(`⚡ Port ${PREFERRED} is busy — using port ${port}`);
}

const nextBin = resolve("node_modules/.bin/next");
try {
  execFileSync(nextBin, ["dev", "--port", String(port)], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(port) },
  });
} catch {
  process.exit(1);
}
