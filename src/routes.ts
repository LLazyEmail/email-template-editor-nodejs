import { Router } from "express";
import { ElementsController } from "./modules/elements/elements.controller.js";
import { createElementsRouter } from "./modules/elements/elements.router.js";
import { ElementsService } from "./modules/elements/elements.service.js";
import { GenerateController } from "./modules/generate/generate.controller.js";
import { createGenerateRouter } from "./modules/generate/generate.router.js";
import { GenerateService } from "./modules/generate/generate.service.js";
import { TreeController } from "./modules/tree/tree.controller.js";
import { createTreeRouter } from "./modules/tree/tree.router.js";
import { TreeService } from "./modules/tree/tree.service.js";
import type { TemplateStore } from "./storage/template-store.js";

export interface RouteDeps {
  store: TemplateStore;
  publicDir: string;
}

/** Composition root for the feature modules: wires store → services → controllers → routers. */
export function createRoutes({ store, publicDir }: RouteDeps): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.use("/tree", createTreeRouter(new TreeController(new TreeService(store))));
  router.use("/elements", createElementsRouter(new ElementsController(new ElementsService(store))));
  router.use(
    "/generate",
    createGenerateRouter(new GenerateController(new GenerateService(store, publicDir))),
  );

  return router;
}
