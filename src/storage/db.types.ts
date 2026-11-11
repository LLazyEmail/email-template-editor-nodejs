export interface TreeNode {
  title: string;
  key: string;
  value: string;
  children?: TreeNode[];
}

export interface Element {
  key: string;
  title: string;
  value: string;
}

/** On-disk shape of db.json (kept compatible with the previous lowdb format). */
export interface DbData {
  recipeTemplate: {
    tree: TreeNode[];
    options: Element[];
  };
}

export function createEmptyDb(): DbData {
  return { recipeTemplate: { tree: [], options: [] } };
}
