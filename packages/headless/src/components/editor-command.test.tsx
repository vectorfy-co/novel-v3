import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditorCommand, EditorCommandOut, EditorCommandPortalContext } from "./editor-command";
import { novelStore } from "../utils/store";
import { queryAtom, rangeAtom } from "../utils/atoms";

let lastCommandProps: Record<string, unknown> | null = null;

vi.mock("cmdk", () => {
  const Command = ({ children, ...props }: { children: React.ReactNode }) => {
    lastCommandProps = props;
    return (
      <div data-testid="cmdk" {...props}>
        {children}
      </div>
    );
  };
  Command.Input = ({ onValueChange, value, ...rest }: Record<string, unknown>) => (
    <input
      data-testid="cmdk-input"
      value={value as string | number | readonly string[] | undefined}
      onChange={(event) => (onValueChange as ((next: string) => void) | undefined)?.(event.currentTarget.value)}
      readOnly={!onValueChange}
      {...rest}
    />
  );
  Command.List = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Command,
    CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CommandItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

describe("EditorCommand", () => {
  it("updates query and range atoms via EditorCommandOut", () => {
    const setPortalContainer = vi.fn();

    const commandEl = document.createElement("div");
    commandEl.id = "slash-command";
    const handler = vi.fn();
    commandEl.addEventListener("keydown", (event) => {
      event.stopPropagation();
      handler();
    });
    document.body.appendChild(commandEl);

    render(
      <EditorCommandPortalContext.Provider value={{ portalContainer: null, setPortalContainer }}>
        <EditorCommandOut query="hello" range={{ from: 1, to: 2 }} />
      </EditorCommandPortalContext.Provider>,
    );

    expect(novelStore.get(queryAtom)).toBe("hello");
    expect(novelStore.get(rangeAtom)).toEqual({ from: 1, to: 2 });
    // The container ref callback should have been called
    expect(setPortalContainer).toHaveBeenCalled();

    const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true });
    const preventDefault = vi.fn();
    Object.defineProperty(event, "preventDefault", { value: preventDefault });
    document.dispatchEvent(event);
    expect(handler).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
    commandEl.remove();
  });

  it("renders command input via portal when container is available", () => {
    const portalContainer = document.createElement("div");
    document.body.appendChild(portalContainer);

    render(
      <EditorCommandPortalContext.Provider value={{ portalContainer, setPortalContainer: vi.fn() }}>
        <EditorCommand>
          <div>Child</div>
        </EditorCommand>
      </EditorCommandPortalContext.Provider>,
    );

    expect(screen.getByTestId("cmdk")).toBeInTheDocument();
    expect(screen.getByTestId("cmdk-input")).toBeInTheDocument();

    const stopPropagation = vi.fn();
    (lastCommandProps?.onKeyDown as (event: KeyboardEvent) => void)?.({
      stopPropagation,
    } as KeyboardEvent);
    expect(stopPropagation).toHaveBeenCalled();

    portalContainer.remove();
  });

  it("renders nothing when portal container is not available", () => {
    const { container } = render(
      <EditorCommandPortalContext.Provider value={{ portalContainer: null, setPortalContainer: vi.fn() }}>
        <EditorCommand>
          <div data-testid="child">Child</div>
        </EditorCommand>
      </EditorCommandPortalContext.Provider>,
    );

    expect(container.innerHTML).toBe("");
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });
});
