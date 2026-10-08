import { Command, createSuggestionItems, renderItems } from "@vectorfyco/novel-v3/client";
import {
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  ImageIcon,
  List,
  ListOrdered,
  Minus,
  TextQuote,
  Type,
} from "lucide-react";

export const suggestionItems = createSuggestionItems([
  {
    title: "Text",
    description: "Plain paragraph text.",
    searchTerms: ["p", "paragraph"],
    icon: <Type size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Heading 1",
    description: "Large section heading.",
    searchTerms: ["title", "big", "large"],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading.",
    searchTerms: ["subtitle", "medium"],
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Bullet list",
    description: "Create a simple bulleted list.",
    searchTerms: ["unordered", "point"],
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered list",
    description: "Create a list with numbering.",
    searchTerms: ["ordered"],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "To-do list",
    description: "Track tasks with a checklist.",
    searchTerms: ["todo", "task", "check"],
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quotation.",
    searchTerms: ["blockquote"],
    icon: <TextQuote size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code block",
    description: "Code with syntax highlighting.",
    searchTerms: ["codeblock", "snippet"],
    icon: <Code size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Divider",
    description: "Visually separate sections.",
    searchTerms: ["hr", "line", "rule"],
    icon: <Minus size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Image",
    description: "Insert an image from a URL.",
    searchTerms: ["photo", "picture", "media"],
    icon: <ImageIcon size={18} />,
    command: ({ editor, range }) => {
      const dialog = document.createElement("dialog");
      dialog.className = "image-dialog";
      dialog.setAttribute("aria-label", "Insert image");
      dialog.innerHTML =
        '<form><label>Image URL <input name="src" type="url" required placeholder="https://…" /></label><button type="submit">Insert image</button><button type="button">Cancel</button></form>';
      const input = dialog.querySelector<HTMLInputElement>("input");
      dialog.querySelector("form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const src = input?.value.trim();
        if (!src) return;
        editor.chain().focus().deleteRange(range).setImage({ src }).run();
        dialog.close();
      });
      dialog.querySelector('button[type="button"]')?.addEventListener("click", () => dialog.close());
      dialog.addEventListener("close", () => dialog.remove(), { once: true });
      document.body.append(dialog);
      dialog.showModal();
    },
  },
]);

export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});
