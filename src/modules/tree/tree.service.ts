import { ConflictError, NotFoundError } from "../../common/errors.js";
import type { TreeNode } from "../../storage/db.types.js";
import type { TemplateStore } from "../../storage/template-store.js";
import { addNode, collectKeys, deleteNode, updateNode } from "./tree.helpers.js";
import type { UpdateNodeBody } from "./tree.schemas.js";

export class TreeService {
  constructor(private readonly store: TemplateStore) {}

  async getTree(): Promise<TreeNode[]> {
    const data = await this.store.read();
    return data.recipeTemplate.tree;
  }

  async replaceTree(tree: TreeNode[]): Promise<void> {
    assertUniqueKeys(tree);
    await this.store.update((data) => {
      data.recipeTemplate.tree = tree;
    });
  }

  async addNode(parentKey: string, item: TreeNode): Promise<TreeNode> {
    await this.store.update((data) => {
      const { tree } = data.recipeTemplate;
      const existing = new Set(collectKeys(tree));
      const clash = collectKeys([item]).find((key) => existing.has(key));
      if (clash !== undefined) {
        throw new ConflictError(`Tree node with key "${clash}" already exists`);
      }
      assertUniqueKeys([item]);
      if (!addNode(tree, parentKey, item)) {
        throw new NotFoundError(`Parent tree node "${parentKey}" not found`);
      }
    });
    return item;
  }

  async updateNode(key: string, patch: UpdateNodeBody): Promise<void> {
    await this.store.update((data) => {
      if (!updateNode(data.recipeTemplate.tree, key, patch)) {
        throw new NotFoundError(`Tree node "${key}" not found`);
      }
    });
  }

  async deleteNode(key: string): Promise<void> {
    await this.store.update((data) => {
      if (!deleteNode(data.recipeTemplate.tree, key)) {
        throw new NotFoundError(`Tree node "${key}" not found`);
      }
    });
  }
}

function assertUniqueKeys(nodes: TreeNode[]): void {
  const seen = new Set<string>();
  for (const key of collectKeys(nodes)) {
    if (seen.has(key)) throw new ConflictError(`Duplicate tree node key "${key}"`);
    seen.add(key);
  }
}
