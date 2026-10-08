import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { clientExtensions, TaskItem } from "../extensions";
import { getAllContent, getPrevText, getSelectionText } from "../utils";

const extensions = clientExtensions.map((extension) =>
  extension.name === "taskItem" ? TaskItem.configure({ nested: true }) : extension,
);

const cases = [
  ["bullet", "- first\n- second\n  - third\n    - fourth"],
  ["ordered", "1. first\n2. second\n   1. third\n      1. fourth"],
  ["task", "- [ ] first\n- [x] second\n  - [ ] third\n    - [x] fourth"],
  ["bare fence", "```\nconst value = 'hello';\n```"],
  ["empty alt", "![](https://example.com/image.png)"],
] as const;

describe("Markdown defect round trips", () => {
  it.each(cases)("preserves %s structure through public output helpers", (_name, markdown) => {
    const editor = new Editor({ element: null, extensions, content: markdown, contentType: "markdown" });
    try {
      const doc = editor.getJSON();
      const output = getAllContent(editor);
      expect(getPrevText(editor, editor.state.doc.content.size)).toBe(output);
      editor.commands.setTextSelection({ from: 0, to: editor.state.doc.content.size });
      expect(getSelectionText(editor)).toBe(output);
      expect(output).not.toContain("null");
      expect(output).not.toContain("<ul");
      editor.commands.setContent(output, { contentType: "markdown" });
      expect(editor.getJSON()).toEqual(doc);
      expect(getAllContent(editor)).toBe(output);
      expect(editor.getMarkdown()).toBe(output);
    } finally {
      editor.destroy();
    }
  });
  it("normalizes missing image alt and code language to empty Markdown attributes", () => {
    const editor = new Editor({
      element: null,
      extensions,
      content: {
        type: "doc",
        content: [
          { type: "codeBlock", content: [{ type: "text", text: "const value = 1;" }] },
          { type: "image", attrs: { src: "https://example.com/image.png" } },
        ],
      },
    });
    try {
      expect(editor.getJSON().content?.[0]?.attrs?.language).toBeNull();
      expect(editor.getJSON().content?.[1]?.attrs?.alt).toBeNull();
      const output = getAllContent(editor);
      expect(output).toContain("```\nconst value = 1;\n```");
      expect(output).toContain("![](https://example.com/image.png)");
      expect(output).not.toContain("null");
      editor.commands.setContent(output, { contentType: "markdown" });
      expect(getAllContent(editor)).toBe(output);
      expect(editor.getJSON().content?.[0]?.attrs?.language).toBeNull();
      expect(editor.getJSON().content?.[1]?.attrs?.alt).toBe("");
    } finally {
      editor.destroy();
    }
  });
});
