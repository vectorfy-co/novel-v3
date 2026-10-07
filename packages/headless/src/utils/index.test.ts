import { describe, expect, it, vi } from "vitest";
import { Editor, Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { getAllContent, getPrevText, getSelectionText, getUrlFromString, isValidUrl } from "./index";

describe("utils", () => {
  it("serializes repeated updates without expanding registered extensions again", () => {
    const addExtensions = vi.fn(() => [StarterKit]);
    const bundle = Extension.create({ name: "testBundle", addExtensions });
    const editor = new Editor({ element: null, extensions: [bundle, Markdown], content: "<p>First</p>" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    addExtensions.mockClear();
    try {
      expect(getAllContent(editor)).toContain("First");
      editor.commands.setContent("<p>Second <strong>bold</strong></p>");
      expect(getAllContent(editor)).toContain("Second **bold**");
      editor.commands.setTextSelection({ from: 1, to: 7 });
      expect(getSelectionText(editor)).toContain("Second");
      expect(getPrevText(editor, 7)).toContain("Second");
      expect(addExtensions).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      editor.destroy();
      warn.mockRestore();
    }
  });

  it("validates urls", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("notaurl")).toBe(false);
  });

  it("parses urls from strings", () => {
    expect(getUrlFromString("example.com")).toBe("https://example.com/");
    expect(getUrlFromString("https://example.com")).toBe("https://example.com");
    expect(getUrlFromString("not a url")).toBeUndefined();
    expect(getUrlFromString("example.com:abc")).toBe("example.com:abc");
    expect(getUrlFromString("exa[mple].com")).toBeNull();
  });

  it("returns markdown slices from editor content", () => {
    const editor = new Editor({
      element: null,
      extensions: [StarterKit, Markdown],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello " },
              { type: "text", text: "world" },
            ],
          },
        ],
      },
    });

    const all = getAllContent(editor);
    expect(all).toContain("Hello world");

    const selection = editor.state.selection;
    editor.commands.setTextSelection({ from: selection.from, to: selection.from + 5 });
    const selectionText = getSelectionText(editor);
    expect(selectionText).toContain("Hello");

    const prevText = getPrevText(editor, 4);
    expect(prevText).toContain("Hel");

    editor.destroy();
  });
});
