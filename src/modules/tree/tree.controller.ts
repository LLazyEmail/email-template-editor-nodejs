import type { Request, Response } from "express";
import type { AddNodeBody, SaveTreeBody, UpdateNodeBody } from "./tree.schemas.js";
import type { TreeService } from "./tree.service.js";

/** HTTP adapter: maps requests to TreeService calls. Input is already validated by the router. */
export class TreeController {
  constructor(private readonly service: TreeService) {}

  getTree = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.service.getTree());
  };

  replaceTree = async (req: Request, res: Response): Promise<void> => {
    const { treeData } = req.body as SaveTreeBody;
    await this.service.replaceTree(treeData);
    res.status(204).end();
  };

  addNode = async (req: Request, res: Response): Promise<void> => {
    const { parentKey, item } = req.body as AddNodeBody;
    res.status(201).json(await this.service.addNode(parentKey, item));
  };

  updateNode = async (req: Request<{ key: string }>, res: Response): Promise<void> => {
    await this.service.updateNode(req.params.key, req.body as UpdateNodeBody);
    res.status(204).end();
  };

  deleteNode = async (req: Request<{ key: string }>, res: Response): Promise<void> => {
    await this.service.deleteNode(req.params.key);
    res.status(204).end();
  };
}
