import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorContentProps,
  type EditorInstance,
  EditorRoot,
  handleCommandNavigation,
  type JSONContent,
} from "@vectorfyco/novel-v3/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BubbleMenu } from "./bubble-menu";
import { editorExtensions } from "./extensions";
import { slashCommand, suggestionItems } from "./slash-command";

const initialContent: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Hello from TanStack Start" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Start typing, or press " },
        { type: "text", text: "/", marks: [{ type: "code" }] },
        { type: "text", text: " to open the command menu." },
      ],
    },
  ],
};

const extensions = [...editorExtensions, slashCommand];

// Module scope keeps these props referentially stable across renders.
const editorProps: EditorContentProps["editorProps"] = {
  attributes: { class: "editor-prose", "aria-label": "Document editor" },
  handleDOMEvents: {
    keydown: (_view, event) => handleCommandNavigation(event),
  },
};

interface EditorOutputs {
  readonly json: string;
  readonly markdown: string;
  readonly html: string;
}

const readOutputs = (editor: EditorInstance): EditorOutputs => ({
  json: JSON.stringify(editor.getJSON(), null, 2),
  markdown: editor.getMarkdown(),
  html: editor.getHTML(),
});

// The output panels read from this store. Updating it does not re-render the component that owns the editor,
// which matters because tiptap reconciles the editor instance on every render of its host component.
function createOutputStore() {
  let snapshot: EditorOutputs | null = null;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (next: EditorOutputs) => {
      snapshot = next;
      for (const listener of listeners) listener();
    },
  };
}

type OutputStore = ReturnType<typeof createOutputStore>;

// The editor only exists in the browser. The server and the first client render share this placeholder,
// so hydration matches and no editor code runs during SSR.
export function NovelEditor() {
  const [mounted, setMounted] = useState(false);
  const [outputStore] = useState(createOutputStore);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="editor-placeholder" data-testid="editor-placeholder">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="novel-editor">
      <EditorArea outputStore={outputStore} />
      <OutputPanels outputStore={outputStore} />
    </div>
  );
}

function EditorArea({ outputStore }: Readonly<{ outputStore: OutputStore }>) {
  return (
    <EditorRoot>
      <EditorContent
        extensions={extensions}
        initialContent={initialContent}
        className="editor-surface"
        editorProps={editorProps}
        onCreate={({ editor }) => outputStore.set(readOutputs(editor))}
        onUpdate={({ editor }) => outputStore.set(readOutputs(editor))}
      >
        <EditorCommand className="slash-menu">
          <EditorCommandEmpty className="slash-empty">No matching commands</EditorCommandEmpty>
          <EditorCommandList>
            {suggestionItems.map((item) => (
              <EditorCommandItem
                key={item.title}
                value={item.title}
                onCommand={(props) => item.command?.(props)}
                className="slash-item"
              >
                <span className="slash-icon">{item.icon}</span>
                <span className="slash-text">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
              </EditorCommandItem>
            ))}
          </EditorCommandList>
        </EditorCommand>
        <BubbleMenu />
      </EditorContent>
    </EditorRoot>
  );
}

function OutputPanels({ outputStore }: Readonly<{ outputStore: OutputStore }>) {
  const outputs = useSyncExternalStore(outputStore.subscribe, outputStore.getSnapshot, () => null);

  return (
    <section className="outputs" aria-label="Document output">
      <OutputPanel title="JSON" testId="json-output" value={outputs?.json ?? ""} />
      <OutputPanel title="Markdown" testId="markdown-output" value={outputs?.markdown ?? ""} />
      <OutputPanel title="HTML" testId="html-output" value={outputs?.html ?? ""} />
    </section>
  );
}

function OutputPanel({ title, testId, value }: Readonly<{ title: string; testId: string; value: string }>) {
  return (
    <figure className="output-panel">
      <figcaption>{title}</figcaption>
      <pre data-testid={testId}>{value}</pre>
    </figure>
  );
}
