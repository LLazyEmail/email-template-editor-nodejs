import type { TreeNode } from "../../storage/db.types.js";

/** Pure helpers that operate on (and mutate) a template tree in place. */

export function findNode(tree: TreeNode[], key: string): TreeNode | undefined {
  for (const node of tree) {
    if (node.key === key) return node;
    const found = node.children ? findNode(node.children, key) : undefined;
    if (found) return found;
  }
  return undefined;
}

export function collectKeys(nodes: TreeNode[], into: string[] = []): string[] {
  for (const node of nodes) {
    into.push(node.key);
    if (node.children) collectKeys(node.children, into);
  }
  return into;
}

/** Appends `item` to the children of `parentKey`. Returns false if the parent does not exist. */
export function addNode(tree: TreeNode[], parentKey: string, item: TreeNode): boolean {
  const parent = findNode(tree, parentKey);
  if (!parent) return false;
  (parent.children ??= []).push(item);
  return true;
}

/** Updates title/value of the node with `key`. Returns false if it does not exist. */
export function updateNode(
  tree: TreeNode[],
  key: string,
  patch: Partial<Pick<TreeNode, "title" | "value">>,
): boolean {
  const node = findNode(tree, key);
  if (!node) return false;
  if (patch.title !== undefined) node.title = patch.title;
  if (patch.value !== undefined) node.value = patch.value;
  return true;
}

/** Removes the node with `key` (and its subtree). Returns false if it does not exist. */
export function deleteNode(tree: TreeNode[], key: string): boolean {
  const index = tree.findIndex((node) => node.key === key);
  if (index !== -1) {
    tree.splice(index, 1);
    return true;
  }
  return tree.some((node) => (node.children ? deleteNode(node.children, key) : false));
}
