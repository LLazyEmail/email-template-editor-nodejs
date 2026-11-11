import type { RequestHandler } from "express";
import type { z } from "zod";
import { ValidationError } from "../errors.js";

interface Schemas {
  body?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Validates and replaces `req.body` / `req.params` with the parsed (typed, stripped) values.
 * Fails with a 400 ValidationError listing every issue.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    const issues: { location: string; path: string; message: string }[] = [];

    for (const location of ["params", "body"] as const) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location] ?? {});
      if (result.success) {
        if (location === "body") req.body = result.data;
        else req.params = result.data as typeof req.params;
      } else {
        for (const issue of result.error.issues) {
          issues.push({ location, path: issue.path.join("."), message: issue.message });
        }
      }
    }

    if (issues.length > 0) {
      next(new ValidationError("Request validation failed", issues));
      return;
    }
    next();
  };
}
