import { describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
} from "../client";
import { EditorCommandOut } from "../components/editor-command";
import { clientExtensions } from "../extensions";
import { queryAtom, rangeAtom } from "../utils/atoms";
import { novelStore } from "../utils/store";

const commands = ["Heading 1", "Bullet list", "Code block"];

describe("slash command filtering", () => {
  it("shows only the items that match the query and an empty state when nothing matches", async () => {
    render(
      <EditorRoot>
        <EditorContent extensions={clientExtensions} immediatelyRender={false}>
          <EditorCommandOut query="" range={{ from: 1, to: 1 }} />
          <EditorCommand>
            <EditorCommandList>
              <EditorCommandEmpty>No matching commands</EditorCommandEmpty>
              {commands.map((label) => (
                <EditorCommandItem key={label} value={label} onCommand={() => {}}>
                  {label}
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>
        </EditorContent>
      </EditorRoot>,
    );

    await waitFor(() => expect(screen.getByText("Heading 1")).toBeInTheDocument());
    expect(screen.getByText("Bullet list")).toBeInTheDocument();
    expect(screen.getByText("Code block")).toBeInTheDocument();

    act(() => novelStore.set(queryAtom, "list"));
    await waitFor(() => expect(screen.queryByText("Heading 1")).not.toBeInTheDocument());
    expect(screen.getByText("Bullet list")).toBeInTheDocument();
    expect(screen.queryByText("Code block")).not.toBeInTheDocument();

    act(() => novelStore.set(queryAtom, "zzz"));
    await waitFor(() => expect(screen.getByText("No matching commands")).toBeInTheDocument());
    expect(screen.queryByText("Bullet list")).not.toBeInTheDocument();

    act(() => {
      novelStore.set(queryAtom, "");
      novelStore.set(rangeAtom, null);
    });
  });
});
