import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { TreeNode } from "../../storage/db.types.js";
import { generateHtml } from "./generate-html.js";

const fixture = (name: string) =>
  readFileSync(new URL(`../../../test/fixtures/${name}`, import.meta.url), "utf8");

describe("generateHtml", () => {
  it("matches the output of the previous implementation for the example tree", () => {
    const tree = JSON.parse(fixture("treeDataExample.json")) as TreeNode[];
    expect(generateHtml(tree)).toBe(fixture("treeDataExample.expected.html"));
  });

  it("returns the root value when the root has no children", () => {
    expect(generateHtml([{ key: "r", title: "root", value: "<p>hi</p>" }])).toBe("<p>hi</p>");
  });

  it("replaces only the first occurrence of a placeholder", () => {
    const tree: TreeNode[] = [
      {
        key: "r",
        title: "root",
        value: "{{x}}-{{x}}",
        children: [{ key: "x", title: "{{x}}", value: "X" }],
      },
    ];
    expect(generateHtml(tree)).toBe("X-{{x}}");
  });

  it("inserts values literally, without expanding $ replacement patterns", () => {
    const tree: TreeNode[] = [
      {
        key: "r",
        title: "root",
        value: "<p>{{price}}</p>",
        children: [{ key: "p", title: "{{price}}", value: "$$5 $&" }],
      },
    ];
    expect(generateHtml(tree)).toBe("<p>$$5 $&</p>");
  });

  it("throws on an empty tree", () => {
    expect(() => generateHtml([])).toThrow(/empty tree/);
  });
});
