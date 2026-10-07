import { renderToMarkdown } from "@tiptap/static-renderer/pm/markdown";
import type { Extensions } from "@tiptap/core";
import { Fragment, type Node } from "@tiptap/pm/model";
import type { EditorInstance } from "../components";

// The manager already contains every child extension. The static renderer expands addExtensions
// again, so use cached rendering copies that retain options/renderers but do not expand bundles.
const renderingExtensions = new WeakMap<Extensions, Extensions>();
const getRenderingExtensions = (editor: EditorInstance): Extensions => {
  const registered = editor.extensionManager.extensions;
  let extensions = renderingExtensions.get(registered);
  if (!extensions) {
    extensions = registered.map((extension) => extension.extend({ addExtensions: () => [] }));
    renderingExtensions.set(registered, extensions);
  }
  return extensions;
};

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getUrlFromString(str: string) {
  if (isValidUrl(str)) return str;
  try {
    if (str.includes(".") && !str.includes(" ")) {
      return new URL(`https://${str}`).toString();
    }
  } catch {
    return null;
  }
}

// Get the text before a given position in markdown format
export const getPrevText = (editor: EditorInstance, position: number) => {
  const nodes: Node[] = [];
  editor.state.doc.forEach((node, pos) => {
    if (pos >= position) {
      return;
    }
    nodes.push(node);
  });
  const fragment = Fragment.fromArray(nodes);
  const doc = editor.state.doc.copy(fragment);

  return renderToMarkdown({
    content: doc,
    extensions: getRenderingExtensions(editor),
  });
};

// Get all content from the editor in markdown format
export const getAllContent = (editor: EditorInstance) => {
  const fragment = editor.state.doc.content;
  const doc = editor.state.doc.copy(fragment);

  return renderToMarkdown({
    content: doc,
    extensions: getRenderingExtensions(editor),
  });
};

// Get the selected text in markdown format
export const getSelectionText = (editor: EditorInstance) => {
  const slice = editor.state.selection.content();
  const doc = editor.state.doc.copy(slice.content);

  return renderToMarkdown({
    content: doc,
    extensions: getRenderingExtensions(editor),
  });
};
