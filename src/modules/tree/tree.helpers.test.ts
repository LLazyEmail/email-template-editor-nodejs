import { describe, expect, it } from "vitest";
import type { TreeNode } from "../../storage/db.types.js";
import { addNode, collectKeys, deleteNode, findNode, updateNode } from "./tree.helpers.js";

function makeTree(): TreeNode[] {
  return [
    {
      key: "root",
      title: "root",
      value: "<div>{{a}}{{b}}</div>",
      children: [
        { key: "a", title: "{{a}}", value: "A", children: [] },
        {
          key: "b",
          title: "{{b}}",
          value: "{{c}}",
          children: [{ key: "c", title: "{{c}}", value: "C" }],
        },
      ],
    },
  ];
}

describe("tree helpers", () => {
  it("findNode finds nested nodes and returns undefined for unknown keys", () => {
    const tree = makeTree();
    expect(findNode(tree, "c")?.value).toBe("C");
    expect(findNode(tree, "missing")).toBeUndefined();
  });

  it("collectKeys lists every key depth-first", () => {
    expect(collectKeys(makeTree())).toEqual(["root", "a", "b", "c"]);
  });

  it("addNode appends to the parent's children", () => {
    const tree = makeTree();
    const item = { key: "d", title: "{{d}}", value: "D", children: [] };
    expect(addNode(tree, "b", item)).toBe(true);
    expect(findNode(tree, "b")?.children?.map((n) => n.key)).toEqual(["c", "d"]);
  });

  it("addNode initializes children when the parent has none", () => {
    const tree = makeTree();
    expect(addNode(tree, "c", { key: "e", title: "{{e}}", value: "E" })).toBe(true);
    expect(findNode(tree, "c")?.children).toHaveLength(1);
  });

  it("addNode returns false for an unknown parent", () => {
    const tree = makeTree();
    expect(addNode(tree, "missing", { key: "x", title: "x", value: "x" })).toBe(false);
    expect(tree).toEqual(makeTree());
  });

  it("updateNode applies only the provided fields", () => {
    const tree = makeTree();
    expect(updateNode(tree, "c", { value: "C2" })).toBe(true);
    expect(findNode(tree, "c")).toMatchObject({ title: "{{c}}", value: "C2" });
    expect(updateNode(tree, "missing", { value: "x" })).toBe(false);
  });

  it("deleteNode removes a nested node with its subtree", () => {
    const tree = makeTree();
    expect(deleteNode(tree, "b")).toBe(true);
    expect(collectKeys(tree)).toEqual(["root", "a"]);
    expect(deleteNode(tree, "missing")).toBe(false);
  });
});
