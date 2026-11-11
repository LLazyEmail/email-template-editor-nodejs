import type { Request, Response } from "express";
import type { CreateElementBody, UpdateElementBody } from "./elements.schemas.js";
import type { ElementsService } from "./elements.service.js";

export class ElementsController {
  constructor(private readonly service: ElementsService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.service.list());
  };

  create = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.service.create(req.body as CreateElementBody));
  };

  update = async (req: Request<{ key: string }>, res: Response): Promise<void> => {
    await this.service.update(req.params.key, req.body as UpdateElementBody);
    res.status(204).end();
  };

  remove = async (req: Request<{ key: string }>, res: Response): Promise<void> => {
    await this.service.remove(req.params.key);
    res.status(204).end();
  };
}
