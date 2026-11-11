import path from "node:path";
import { z } from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(9000),
  DB_FILE: z.string().min(1).default("./db.json"),
  PUBLIC_DIR: z.string().min(1).default("./public"),
  CORS_ORIGIN: z.string().min(1).default("*"),
  BODY_LIMIT: z.string().min(1).default("50mb"),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
});

export interface AppConfig {
  nodeEnv: "development" | "production" | "test";
  port: number;
  dbFile: string;
  publicDir: string;
  /** `true` allows any origin, otherwise an explicit allow-list. */
  corsOrigin: true | string[];
  bodyLimit: string;
  logLevel: (typeof LOG_LEVELS)[number];
}

export class ConfigError extends Error {
  override name = "ConfigError";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new ConfigError(`Invalid environment configuration: ${details}`);
  }

  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    dbFile: path.resolve(e.DB_FILE),
    publicDir: path.resolve(e.PUBLIC_DIR),
    corsOrigin:
      e.CORS_ORIGIN === "*"
        ? true
        : e.CORS_ORIGIN.split(",")
            .map((origin) => origin.trim())
            .filter(Boolean),
    bodyLimit: e.BODY_LIMIT,
    logLevel: e.LOG_LEVEL,
  };
}
