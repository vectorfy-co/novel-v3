import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import { clientExtensions } from "../extensions";

const markdownInput = [
  "# Release Notes",
  "",
  "Some **bold** and *italic* text with a [docs link](https://example.com/docs).",
  "",
  "- first item",
  "- second item",
  "",
  "```ts",
  "const total = 1 + 1;",
  "```",
].join("\n");

const createEditor = () => {
  const element = document.createElement("div");
  return new Editor({ element, extensions: clientExtensions, content: "" });
};

const findNodes = (node: JSONContent, type: string): JSONContent[] => {
  const matches = node.type === type ? [node] : [];
  return [...matches, ...(node.content ?? []).flatMap((child) => findNodes(child, type))];
};

describe("markdown round trip", () => {
  it("parses markdown into the expected document structure", () => {
    const editor = createEditor();
    editor.commands.setContent(markdownInput, { contentType: "markdown" });
    const doc = editor.getJSON();

    // The editor keeps an empty paragraph after a trailing code block so the cursor can always move below it.
    expect(doc.content?.map((node) => node.type)).toEqual([
      "heading",
      "paragraph",
      "bulletList",
      "codeBlock",
      "paragraph",
    ]);
    expect(doc.content?.at(-1)?.content).toBeUndefined();

    const [heading] = findNodes(doc, "heading");
    expect(heading?.attrs?.level).toBe(1);
    expect(heading?.content?.[0]?.text).toBe("Release Notes");

    const paragraphText = findNodes(doc, "paragraph")[0]?.content ?? [];
    const bold = paragraphText.find((node) => node.text === "bold");
    const italic = paragraphText.find((node) => node.text === "italic");
    const link = paragraphText.find((node) => node.text === "docs link");
    expect(bold?.marks?.map((mark) => mark.type)).toEqual(["bold"]);
    expect(italic?.marks?.map((mark) => mark.type)).toEqual(["italic"]);
    expect(link?.marks?.find((mark) => mark.type === "link")?.attrs?.href).toBe("https://example.com/docs");

    const [list] = findNodes(doc, "bulletList");
    expect(list?.content?.map((item) => item.content?.[0]?.content?.[0]?.text)).toEqual(["first item", "second item"]);

    const [code] = findNodes(doc, "codeBlock");
    expect(code?.attrs?.language).toBe("ts");
    expect(code?.content?.[0]?.text).toBe("const total = 1 + 1;");

    editor.destroy();
  });

  it("serialises the document back to markdown that parses to the same document", () => {
    const editor = createEditor();
    editor.commands.setContent(markdownInput, { contentType: "markdown" });
    const firstDoc = editor.getJSON();
    const markdownOut = editor.getMarkdown();

    expect(markdownOut).toContain("# Release Notes");
    expect(markdownOut).toMatch(/\*\*bold\*\*/);
    expect(markdownOut).toMatch(/[*_]italic[*_]/);
    expect(markdownOut).toContain("[docs link](https://example.com/docs)");
    expect(markdownOut).toMatch(/^[-*] first item$/m);
    expect(markdownOut).toMatch(/^[-*] second item$/m);
    expect(markdownOut).toContain("```ts\nconst total = 1 + 1;\n```");

    editor.commands.setContent(markdownOut, { contentType: "markdown" });
    expect(editor.getJSON()).toEqual(firstDoc);
    expect(editor.getMarkdown()).toBe(markdownOut);

    editor.destroy();
  });
});
