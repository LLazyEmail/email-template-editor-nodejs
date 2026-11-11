import { Router } from "express";
import type { GenerateController } from "./generate.controller.js";

export function createGenerateRouter(controller: GenerateController): Router {
  const router = Router();
  router.post("/", controller.generate);
  return router;
}
