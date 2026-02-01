import { useAtom, useSetAtom } from "jotai";
import { useEffect, forwardRef, createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { queryAtom, rangeAtom } from "../utils/atoms";
import { novelStore } from "../utils/store";
import type { ComponentPropsWithoutRef, FC, ReactNode } from "react";
import type { Range } from "@tiptap/core";

interface PortalContextValue {
  portalContainer: HTMLElement | null;
  setPortalContainer: (container: HTMLElement | null) => void;
}

export const EditorCommandPortalContext = createContext<PortalContextValue>({
  portalContainer: null,
  setPortalContainer: () => {},
});

export const useEditorCommandPortal = () => {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  return { portalContainer, setPortalContainer };
};

interface EditorCommandOutProps {
  readonly query: string;
  readonly range: Range;
}

export const EditorCommandOut: FC<EditorCommandOutProps> = ({ query, range }) => {
  const setQuery = useSetAtom(queryAtom, { store: novelStore });
  const setRange = useSetAtom(rangeAtom, { store: novelStore });
  const { setPortalContainer } = useContext(EditorCommandPortalContext);

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      setPortalContainer(node);
    },
    [setPortalContainer],
  );

  useEffect(() => {
    setQuery(query);
  }, [query, setQuery]);

  useEffect(() => {
    setRange(range);
  }, [range, setRange]);

  useEffect(() => {
    const navigationKeys = ["ArrowUp", "ArrowDown", "Enter"];
    const onKeyDown = (e: KeyboardEvent) => {
      if (navigationKeys.includes(e.key)) {
        e.preventDefault();
        const commandRef = document.querySelector("#slash-command");

        if (commandRef)
          commandRef.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: e.key,
              cancelable: true,
              bubbles: true,
            }),
          );

        return false;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return <div ref={containerRef} />;
};

export const EditorCommand = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof Command>>(
  ({ children, className, ...rest }, ref) => {
    const [query, setQuery] = useAtom(queryAtom);
    const { portalContainer } = useContext(EditorCommandPortalContext);

    const content = (
      <Command
        ref={ref}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        id="slash-command"
        className={className}
        {...rest}
      >
        <Command.Input value={query} onValueChange={setQuery} style={{ display: "none" }} />
        {children}
      </Command>
    );

    if (!portalContainer) return null;

    return createPortal(content, portalContainer);
  },
);
export const EditorCommandList = Command.List;

EditorCommand.displayName = "EditorCommand";
