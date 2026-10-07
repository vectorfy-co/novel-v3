import { Editor } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";
import { clientExtensions, HorizontalRule } from "./index";
import { HorizontalRule as ServerHorizontalRule, serverExtensions } from "./server";

type PlaceholderExtension = {
  options: {
    placeholder: (args: { node: { type: { name: string }; attrs: Record<string, unknown> } }) => string;
  };
};

type InputRuleHandlerArgs = {
  state: {
    tr: {
      insert: (...args: unknown[]) => unknown;
      delete: (...args: unknown[]) => unknown;
      mapping: { map: (value: number) => number };
    };
  };
  range: { from: number; to: number };
  match: RegExpMatchArray;
  commands: never;
  chain: () => never;
  can: () => never;
};

type HorizontalRuleExtension = {
  type: { create: () => unknown };
  config: { addInputRules: () => Array<{ handler: (args: InputRuleHandlerArgs) => void }> };
};

describe("extensions bundles", () => {
  it.each([[clientExtensions], [serverExtensions]])("registers each extension once", (extensions) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const editor = new Editor({ element: null, extensions, content: "" });
    try {
      const names = editor.extensionManager.extensions.map((extension) => extension.name);
      expect(names.filter((name) => name === "horizontalRule")).toHaveLength(1);
      expect(names.filter((name) => name === "codeBlock")).toHaveLength(1);
      expect(names.filter((name) => name === "image")).toHaveLength(1);
      expect(new Set(names).size).toBe(names.length);
      expect(warn).not.toHaveBeenCalled();
      expect(editor.commands.setHorizontalRule()).toBe(true);
      expect(editor.getJSON().content?.some((node) => node.type === "horizontalRule")).toBe(true);
    } finally {
      editor.destroy();
      warn.mockRestore();
    }
  });

  it("includes core client extensions", () => {
    const names = clientExtensions.map((extension) => extension.name);
    expect(names).toContain("starterKit");
    expect(names).toContain("placeholder");
    expect(names).toContain("image");
  });

  it("invokes client placeholder and horizontal rule handlers", () => {
    const editor = new Editor({
      element: null,
      extensions: clientExtensions,
      content: "Hello",
    });

    const placeholder = editor.extensionManager.extensions.find((ext) => ext.name === "placeholder");
    if (!placeholder) {
      throw new Error("Placeholder extension missing");
    }
    const placeholderExtension = placeholder as PlaceholderExtension;
    const headingText = placeholderExtension.options.placeholder({
      node: { type: { name: "heading" }, attrs: { level: 2 } },
    });
    const paragraphText = placeholderExtension.options.placeholder({
      node: { type: { name: "paragraph" }, attrs: {} },
    });
    expect(headingText).toBe("Heading 2");
    expect(paragraphText).toBe("Press '/' for commands");

    const horizontal = HorizontalRule as unknown as HorizontalRuleExtension;
    const create = vi.fn(() => ({}));
    horizontal.type = { create };
    const rules = horizontal.config.addInputRules.call(horizontal);
    expect(rules).toHaveLength(1);
    const tr = {
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      mapping: { map: (value: number) => value },
    };
    const match = Object.assign(["---", "---"], { index: 0, input: "---" }) as RegExpMatchArray;
    rules[0].handler({
      state: { tr },
      range: { from: 2, to: 4 },
      match,
      commands: {} as never,
      chain: () => ({}) as never,
      can: () => ({}) as never,
    });
    expect(create).toHaveBeenCalled();
    expect(tr.insert).toHaveBeenCalled();

    editor.destroy();
  });

  it("includes core server extensions", () => {
    const names = serverExtensions.map((extension) => extension.name);
    expect(names).toContain("starterKit");
    expect(names).toContain("placeholder");
    expect(names).toContain("image");
  });

  it("invokes server placeholder handler", () => {
    const editor = new Editor({
      element: null,
      extensions: serverExtensions,
      content: "Hello",
    });

    const placeholder = editor.extensionManager.extensions.find((ext) => ext.name === "placeholder");
    if (!placeholder) {
      throw new Error("Placeholder extension missing");
    }
    const placeholderExtension = placeholder as PlaceholderExtension;
    const headingText = placeholderExtension.options.placeholder({
      node: { type: { name: "heading" }, attrs: { level: 1 } },
    });
    expect(headingText).toBe("Heading 1");

    const paragraphText = placeholderExtension.options.placeholder({
      node: { type: { name: "paragraph" }, attrs: {} },
    });
    expect(paragraphText).toBe("Press '/' for commands");

    const horizontal = ServerHorizontalRule as unknown as HorizontalRuleExtension;
    const create = vi.fn(() => ({}));
    horizontal.type = { create };
    const rules = horizontal.config.addInputRules.call(horizontal);
    expect(rules).toHaveLength(1);
    const tr = {
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      mapping: { map: (value: number) => value },
    };
    const match = Object.assign(["---", "---"], { index: 0, input: "---" }) as RegExpMatchArray;
    rules[0].handler({
      state: { tr },
      range: { from: 2, to: 4 },
      match,
      commands: {} as never,
      chain: () => ({}) as never,
      can: () => ({}) as never,
    });
    expect(create).toHaveBeenCalled();
    expect(tr.insert).toHaveBeenCalled();
    editor.destroy();
  });
});
