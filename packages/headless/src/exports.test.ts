import { describe, expect, it } from "vitest";
import packageJsonData from "../package.json";
import * as root from "./index";
import * as client from "./client";
import * as core from "./client/core";
import * as server from "./server";

type PackageExports = Record<string, { types: string; import: string; require: string }>;

const packageJson: { exports: PackageExports } = packageJsonData;

const CLIENT_EXPORTS = [
  "AIHighlight",
  "CharacterCount",
  "CodeBlockLowlight",
  "Color",
  "Command",
  "CustomKeymap",
  "EditorBubble",
  "EditorBubbleItem",
  "EditorCommand",
  "EditorCommandEmpty",
  "EditorCommandItem",
  "EditorCommandList",
  "EditorContent",
  "EditorRoot",
  "GlobalDragHandle",
  "HighlightExtension",
  "HorizontalRule",
  "ImageResizer",
  "InputRule",
  "MarkdownExtension",
  "Mathematics",
  "Placeholder",
  "StarterKit",
  "TaskItem",
  "TaskList",
  "TextStyle",
  "TiptapImage",
  "TiptapLink",
  "TiptapUnderline",
  "Twitter",
  "UpdatedImage",
  "UploadImagesPlugin",
  "Youtube",
  "addAIHighlight",
  "createImageUpload",
  "createSuggestionItems",
  "getAllContent",
  "getPrevText",
  "getSelectionText",
  "getUrlFromString",
  "handleCommandNavigation",
  "handleImageDrop",
  "handleImagePaste",
  "isValidUrl",
  "queryAtom",
  "rangeAtom",
  "removeAIHighlight",
  "renderItems",
  "useEditor",
];

const CORE_EXPORTS = [
  "EditorBubble",
  "EditorBubbleItem",
  "EditorCommand",
  "EditorCommandEmpty",
  "EditorCommandItem",
  "EditorCommandList",
  "EditorContent",
  "EditorRoot",
  "useEditor",
];

const SERVER_EXPORTS = ["createServerEditor", "renderToHTMLString", "renderToMarkdown", "serverExtensions"];

const sortedKeys = (namespace: object) => Object.keys(namespace).sort();

describe("exports", () => {
  it("exposes client and server entry points", () => {
    expect(root).toBeTruthy();
    expect(client.EditorRoot).toBeDefined();
    expect(core.EditorRoot).toBeDefined();
    expect(server.renderToHTMLString).toBeDefined();
  });

  it("resolves every package.json export entry to a source file", () => {
    const sourceEntries = Object.keys(packageJson.exports).map((subpath) => {
      const distFile = packageJson.exports[subpath]?.import ?? "";
      return distFile.replace("./dist/", "src/").replace(/\.js$/, ".ts");
    });

    expect(sourceEntries.sort()).toEqual(
      ["src/client/core.ts", "src/client/index.ts", "src/index.ts", "src/server/index.ts"].sort(),
    );
  });

  it("exports the documented client API, and every export is defined", () => {
    expect(sortedKeys(client)).toEqual([...CLIENT_EXPORTS].sort());
    for (const [name, value] of Object.entries(client)) {
      expect(value, name).toBeDefined();
    }
  });

  it("re-exports the client API from the root entry", () => {
    expect(sortedKeys(root)).toEqual(sortedKeys(client));
  });

  it("exports the core entry points, and every export is defined", () => {
    expect(sortedKeys(core)).toEqual([...CORE_EXPORTS].sort());
    for (const [name, value] of Object.entries(core)) {
      expect(value, name).toBeDefined();
    }
  });

  it("exports the server entry points, and every export is defined", () => {
    expect(sortedKeys(server)).toEqual([...SERVER_EXPORTS].sort());
    for (const [name, value] of Object.entries(server)) {
      expect(value, name).toBeDefined();
    }
  });
});
