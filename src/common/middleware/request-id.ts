import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const REQUEST_ID_HEADER = "X-Request-Id";
const VALID_ID = /^[\w.-]{1,128}$/;

declare module "express-serve-static-core" {
  interface Request {
    id: string;
  }
}

/** Reuses a sane incoming X-Request-Id or generates one, and echoes it back. */
export function requestId(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.get(REQUEST_ID_HEADER);
    req.id = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, req.id);
    next();
  };
}
