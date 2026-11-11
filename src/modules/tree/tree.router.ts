import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import type { TreeController } from "./tree.controller.js";
import {
  addNodeBodySchema,
  nodeParamsSchema,
  saveTreeBodySchema,
  updateNodeBodySchema,
} from "./tree.schemas.js";

export function createTreeRouter(controller: TreeController): Router {
  const router = Router();

  router.get("/", controller.getTree);
  router.put("/", validate({ body: saveTreeBodySchema }), controller.replaceTree);
  router.post("/nodes", validate({ body: addNodeBodySchema }), controller.addNode);
  router.patch(
    "/nodes/:key",
    validate({ params: nodeParamsSchema, body: updateNodeBodySchema }),
    controller.updateNode,
  );
  router.delete("/nodes/:key", validate({ params: nodeParamsSchema }), controller.deleteNode);

  return router;
}
