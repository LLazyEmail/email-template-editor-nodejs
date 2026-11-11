import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../../common/errors.js";
import type { TemplateStore } from "../../storage/template-store.js";
import { generateHtml } from "./generate-html.js";

export const GENERATED_FILE_NAME = "nmtgTemplate.html";

export class GenerateService {
  constructor(
    private readonly store: TemplateStore,
    private readonly publicDir: string,
  ) {}

  /** Renders the current tree to `<publicDir>/generated/<file>` and returns its public path. */
  async generate(): Promise<{ publicPath: string }> {
    const { tree } = (await this.store.read()).recipeTemplate;
    if (tree.length === 0) {
      throw new AppError(422, "TREE_EMPTY", "Template tree is empty, add a root element first");
    }

    const html = generateHtml(tree);
    const dir = path.join(this.publicDir, "generated");
    const target = path.join(dir, GENERATED_FILE_NAME);
    const tmp = `${target}.${randomUUID()}.tmp`;

    await mkdir(dir, { recursive: true });
    await writeFile(tmp, html);
    await rename(tmp, target);

    return { publicPath: `/generated/${GENERATED_FILE_NAME}` };
  }
}
