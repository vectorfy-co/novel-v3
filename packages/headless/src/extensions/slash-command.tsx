import { Extension } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { autoUpdate, computePosition, flip, offset, shift, type VirtualElement } from "@floating-ui/dom";
import { ReactRenderer } from "@tiptap/react";
import { Suggestion, type SuggestionOptions } from "@tiptap/suggestion";
import type { RefObject } from "react";
import type { ReactNode } from "react";
import { EditorCommandOut } from "../components/editor-command";

// The editor instance is supplied by the extension, so callers never pass it.
type SlashCommandSuggestion = Omit<SuggestionOptions, "editor">;

const Command: Extension = Extension.create({
  name: "slash-command",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
      } as SlashCommandSuggestion,
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        ...this.options.suggestion,
        editor: this.editor,
      }),
    ];
  },
});

const renderItems = (elementRef?: RefObject<Element> | null) => {
  let component: ReactRenderer | null = null;
  let popup: HTMLDivElement | null = null;
  let cleanup: (() => void) | null = null;

  const updatePosition = (clientRect: (() => DOMRect | null) | null | undefined) => {
    if (!popup || !clientRect) return;
    const rect = clientRect();
    if (!rect) return;

    const virtualElement: VirtualElement = {
      getBoundingClientRect: () => rect,
    };

    computePosition(virtualElement, popup, {
      placement: "bottom-start",
      middleware: [offset(8), flip(), shift()],
    }).then(({ x, y }) => {
      popup?.style.setProperty("left", `${x}px`);
      popup?.style.setProperty("top", `${y}px`);
    });
  };

  return {
    onStart: (props: { editor: Editor; clientRect?: (() => DOMRect | null) | null }) => {
      const { selection } = props.editor.state;

      const parentNode = selection.$from.node(selection.$from.depth);
      const blockType = parentNode.type.name;

      if (blockType === "codeBlock") {
        return false;
      }

      component = new ReactRenderer(EditorCommandOut, {
        props,
        editor: props.editor,
      });

      popup = document.createElement("div");
      popup.style.position = "absolute";
      popup.style.top = "0";
      popup.style.left = "0";
      popup.style.zIndex = "50";
      popup.appendChild(component.element);

      const container = elementRef?.current ?? document.body;
      container.appendChild(popup);

      updatePosition(props.clientRect);

      if (props.clientRect) {
        const virtualElement: VirtualElement = {
          getBoundingClientRect: () => props.clientRect?.() ?? new DOMRect(),
        };
        cleanup = autoUpdate(virtualElement, popup, () => updatePosition(props.clientRect));
      }
    },
    onUpdate: (props: { editor: Editor; clientRect?: (() => DOMRect | null) | null }) => {
      component?.updateProps(props);

      updatePosition(props.clientRect);
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        return true;
      }

      // @ts-expect-error tiptap suggestion renderer refs are not strongly typed
      return component?.ref?.onKeyDown?.(props);
    },
    onExit: () => {
      cleanup?.();
      cleanup = null;
      component?.destroy();
      component = null;
      popup?.remove();
      popup = null;
    },
  };
};

export interface SuggestionItem {
  title: string;
  description: string;
  icon: ReactNode;
  searchTerms?: string[];
  command?: (props: { editor: Editor; range: Range }) => void;
}

export const createSuggestionItems = (items: SuggestionItem[]) => items;

export const handleCommandNavigation = (event: KeyboardEvent) => {
  if (["ArrowUp", "ArrowDown", "Enter"].includes(event.key)) {
    const slashCommand = document.querySelector("#slash-command");
    if (slashCommand) {
      return true;
    }
  }
};

export { Command, renderItems };
