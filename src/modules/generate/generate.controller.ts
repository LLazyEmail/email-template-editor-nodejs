import type { Request, Response } from "express";
import type { GenerateService } from "./generate.service.js";

export class GenerateController {
  constructor(private readonly service: GenerateService) {}

  generate = async (req: Request, res: Response): Promise<void> => {
    const { publicPath } = await this.service.generate();
    res.json({ url: `${req.protocol}://${req.get("host")}${publicPath}` });
  };
}
