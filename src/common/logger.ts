import { pino, type Logger } from "pino";
import type { AppConfig } from "../config/env.js";

export type { Logger };

export function createLogger(config: Pick<AppConfig, "logLevel" | "nodeEnv">): Logger {
  return pino({
    level: config.logLevel,
    redact: ["req.headers.authorization", "req.headers.cookie"],
    ...(config.nodeEnv === "development"
      ? { transport: { target: "pino-pretty", options: { singleLine: true } } }
      : {}),
  });
}
