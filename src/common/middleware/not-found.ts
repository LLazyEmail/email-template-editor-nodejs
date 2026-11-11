import type { RequestHandler } from "express";
import { NotFoundError } from "../errors.js";

export function notFound(): RequestHandler {
  return (req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
  };
}
