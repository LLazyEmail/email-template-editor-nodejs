import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors.js";
import type { Logger } from "../logger.js";

interface ErrorBody {
  error: { code: string; message: string; details?: unknown; requestId?: string };
}

/** Errors raised by body-parser / http-errors carry `status` and `type`. */
interface HttpLikeError {
  status?: number;
  statusCode?: number;
  type?: string;
  expose?: boolean;
  message?: string;
}

function toHttp(err: unknown): {
  status: number;
  code: string;
  message: string;
  details?: unknown;
} {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }

  const httpErr = (typeof err === "object" && err !== null ? err : {}) as HttpLikeError;
  const status = httpErr.status ?? httpErr.statusCode;

  if (httpErr.type === "entity.too.large") {
    return { status: 413, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" };
  }
  if (httpErr.type === "entity.parse.failed") {
    return { status: 400, code: "INVALID_JSON", message: "Request body is not valid JSON" };
  }
  if (status && status >= 400 && status < 500 && httpErr.expose) {
    return { status, code: "BAD_REQUEST", message: httpErr.message ?? "Bad request" };
  }

  return { status: 500, code: "INTERNAL_ERROR", message: "Internal server error" };
}

export function errorHandler(options: {
  logger: Logger;
  exposeStack: boolean;
}): ErrorRequestHandler {
  return (err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const { status, code, message, details } = toHttp(err);
    const log = req.log ?? options.logger;

    if (status >= 500) {
      log.error({ err }, "Unhandled error");
    } else {
      log.warn({ code, status }, message);
    }

    const body: ErrorBody = { error: { code, message, requestId: req.id } };
    if (details !== undefined) body.error.details = details;
    if (status >= 500 && options.exposeStack && err instanceof Error) {
      body.error.details = { stack: err.stack };
    }

    res.status(status).json(body);
  };
}
