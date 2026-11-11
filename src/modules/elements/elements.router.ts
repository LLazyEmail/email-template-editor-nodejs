import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import type { ElementsController } from "./elements.controller.js";
import {
  createElementBodySchema,
  elementParamsSchema,
  updateElementBodySchema,
} from "./elements.schemas.js";

export function createElementsRouter(controller: ElementsController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", validate({ body: createElementBodySchema }), controller.create);
  router.patch(
    "/:key",
    validate({ params: elementParamsSchema, body: updateElementBodySchema }),
    controller.update,
  );
  router.delete("/:key", validate({ params: elementParamsSchema }), controller.remove);

  return router;
}
