import { createApp } from "./app.js";
import { createLogger } from "./common/logger.js";
import { loadConfig } from "./config/env.js";
import { JsonFileStore } from "./storage/json-file-store.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);

  const store = new JsonFileStore(config.dbFile);
  await store.init();

  const app = createApp({ config, store, logger });
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, dbFile: config.dbFile }, "Server listening");
  });

  server.on("error", (err) => {
    logger.fatal({ err }, "HTTP server error");
    process.exit(1);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutting down");
    const timer = setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    timer.unref();

    server.close((err) => {
      if (err) {
        logger.error({ err }, "Error during shutdown");
        process.exit(1);
      }
      process.exit(0);
    });
    server.closeIdleConnections();
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });
}

main().catch((err: unknown) => {
  // Logger may not exist yet (e.g. invalid config), so fall back to stderr.
  process.stderr.write(
    `Failed to start server: ${err instanceof Error ? err.stack : String(err)}\n`,
  );
  process.exit(1);
});
