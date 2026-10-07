import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { EditorContent, EditorRoot } from "../client";
import type { JSONContent } from "../client";
import { clientExtensions } from "../extensions";

const initialContent: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Welcome to novel" }] },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Rendered from JSON", marks: [{ type: "bold" }] }],
    },
  ],
};

describe("editor mount", () => {
  it("mounts with the default extensions and renders the initial JSON content", async () => {
    const { container } = render(
      <EditorRoot>
        <EditorContent extensions={clientExtensions} initialContent={initialContent} immediatelyRender={false} />
      </EditorRoot>,
    );

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror h2")).toHaveTextContent("Welcome to novel");
    });
    expect(container.querySelector(".ProseMirror p strong")).toHaveTextContent("Rendered from JSON");
  });
});
