import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NovelEditor } from "./novel-editor";

describe("NovelEditor", () => {
  it("shows typed content in the JSON, Markdown and HTML panels", async () => {
    const user = userEvent.setup();
    const { container } = render(<NovelEditor />);

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror")).not.toBeNull();
    });
    const surface = container.querySelector<HTMLElement>(".ProseMirror");
    if (!surface) throw new Error("editor surface was not rendered");

    await user.click(surface);
    await user.keyboard("Typed in the test");

    await waitFor(() => {
      expect(screen.getByTestId("json-output")).toHaveTextContent("Typed in the test");
    });
    expect(screen.getByTestId("markdown-output")).toHaveTextContent("Typed in the test");
    expect(screen.getByTestId("html-output")).toHaveTextContent("Typed in the test");
  });
});
