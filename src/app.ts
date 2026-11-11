import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Logger } from "./common/logger.js";
import { errorHandler } from "./common/middleware/error-handler.js";
import { notFound } from "./common/middleware/not-found.js";
import { REQUEST_ID_HEADER, requestId } from "./common/middleware/request-id.js";
import type { AppConfig } from "./config/env.js";
import { createRoutes } from "./routes.js";
import type { TemplateStore } from "./storage/template-store.js";

export interface AppDeps {
  config: AppConfig;
  store: TemplateStore;
  logger: Logger;
}

export function createApp({ config, store, logger }: AppDeps): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    helmet({
      // Generated email templates are full HTML documents with inline styles and remote
      // images, opened directly in the browser, so a strict CSP would break them.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cors({ origin: config.corsOrigin, exposedHeaders: [REQUEST_ID_HEADER] }));
  app.use(requestId());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).id,
      autoLogging: { ignore: (req) => req.url === "/health" },
    }),
  );
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.static(config.publicDir));

  app.use(createRoutes({ store, publicDir: config.publicDir }));

  app.use(notFound());
  app.use(errorHandler({ logger, exposeStack: config.nodeEnv === "development" }));

  return app;
}
