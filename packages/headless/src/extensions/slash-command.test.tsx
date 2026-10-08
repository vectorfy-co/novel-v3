import { describe, expect, it, vi } from "vitest";
import { Command, createSuggestionItems, handleCommandNavigation, renderItems } from "./slash-command";

vi.mock("@tiptap/react", () => {
  class ReactRenderer {
    element: HTMLElement;
    props: unknown;
    ref = { onKeyDown: () => true };

    constructor(_component: unknown, { props }: { props: unknown }) {
      this.props = props;
      this.element = document.createElement("div");
    }

    updateProps(props: unknown) {
      this.props = props;
    }

    destroy() {}
  }

  return { ReactRenderer };
});

vi.mock("@floating-ui/dom", () => ({
  autoUpdate: () => () => {},
  computePosition: () => Promise.resolve({ x: 10, y: 20 }),
  flip: () => ({}),
  offset: () => ({}),
  shift: () => ({}),
}));

vi.mock("@tiptap/suggestion", () => ({
  Suggestion: vi.fn(() => ({ key: "suggestion" })),
}));

describe("slash-command", () => {
  it("creates suggestion items", () => {
    const items = [{ title: "Heading", description: "", icon: null }];
    expect(createSuggestionItems(items)).toBe(items);
  });

  it("configures command extension options and plugins", async () => {
    const options = Command.config.addOptions.call(Command) as {
      suggestion: {
        command: (args: {
          editor: unknown;
          range: { from: number; to: number };
          props: { command: (args: unknown) => void };
        }) => void;
      };
    };
    const commandSpy = vi.fn();
    options.suggestion.command({
      editor: {},
      range: { from: 1, to: 2 },
      props: { command: commandSpy },
    });
    expect(commandSpy).toHaveBeenCalled();

    const plugins = Command.config.addProseMirrorPlugins.call({ editor: {}, options });
    const { Suggestion: suggestionMock } = await import("@tiptap/suggestion");
    expect(suggestionMock).toHaveBeenCalled();
    expect(plugins).toHaveLength(1);
  });

  it("handles command navigation when slash command is present", () => {
    const el = document.createElement("div");
    el.id = "slash-command";
    document.body.appendChild(el);

    const result = handleCommandNavigation(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(result).toBe(true);

    el.remove();
  });

  it("skips rendering in code blocks", () => {
    const items = renderItems();
    const editor = {
      state: {
        selection: {
          $from: {
            depth: 1,
            node: () => ({ type: { name: "codeBlock" } }),
          },
        },
      },
    };

    const result = items.onStart({ editor, clientRect: () => new DOMRect() });
    expect(result).toBe(false);
  });

  it("handles start without client rect", () => {
    const items = renderItems();
    const editor = {
      state: {
        selection: {
          $from: {
            depth: 1,
            node: () => ({ type: { name: "paragraph" } }),
          },
        },
      },
    };

    items.onStart({ editor, clientRect: null });
    const handled = items.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) });
    expect(handled).toBe(true);
    items.onExit();
  });

  it("renders and cleans up popup", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const items = renderItems({ current: container });
    const editor = {
      state: {
        selection: {
          $from: {
            depth: 1,
            node: () => ({ type: { name: "paragraph" } }),
          },
        },
      },
    };

    const clientRect = () => new DOMRect(0, 0, 10, 10);
    items.onStart({ editor, clientRect });
    expect(container.querySelector("div")).toBeTruthy();

    const handled = items.onKeyDown({ event: new KeyboardEvent("keydown", { key: "Escape" }) });
    expect(handled).toBe(true);

    items.onUpdate({ editor, clientRect });
    const handledByRef = items.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) });
    expect(handledByRef).toBe(true);

    items.onExit();
    expect(container.querySelector("div")).toBeNull();
    container.remove();
  });
});
