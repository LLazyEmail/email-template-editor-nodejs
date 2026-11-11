import type { TreeNode } from "../../storage/db.types.js";

/**
 * Renders the template tree into HTML: each child's `title` placeholder (e.g. `{{items}}`)
 * inside its parent's `value` is replaced (first occurrence) by the child's rendered value.
 */
export function generateHtml(tree: TreeNode[]): string {
  const root = tree[0];
  if (!root) throw new Error("Cannot generate HTML from an empty tree");
  return render(root);
}

function render(node: TreeNode): string {
  let html = node.value;
  for (const child of node.children ?? []) {
    const rendered = child.children?.length ? render(child) : child.value;
    // Replacer function: inserts `rendered` literally, so `$&`, `$$` etc. in HTML are not expanded.
    html = html.replace(child.title, () => rendered);
  }
  return html;
}
