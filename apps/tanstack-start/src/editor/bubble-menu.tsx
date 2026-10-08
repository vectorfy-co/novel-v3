import { EditorBubble, EditorBubbleItem, getUrlFromString, useEditor } from "@vectorfyco/novel-v3/client";
import { Bold, Code2, Italic, Link, Strikethrough, Underline, Trash } from "lucide-react";

import { useState } from "react";

export function BubbleMenu() {
  const { editor } = useEditor();
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  return (
    <EditorBubble options={{ placement: "top" }} className="bubble-menu">
      <EditorBubbleItem
        className="bubble-button"
        aria-label="Bold"
        onSelect={(current) => current.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </EditorBubbleItem>
      <EditorBubbleItem
        className="bubble-button"
        aria-label="Italic"
        onSelect={(current) => current.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </EditorBubbleItem>
      <EditorBubbleItem
        className="bubble-button"
        aria-label="Underline"
        onSelect={(current) => current.chain().focus().toggleUnderline().run()}
      >
        <Underline size={16} />
      </EditorBubbleItem>
      <EditorBubbleItem
        className="bubble-button"
        aria-label="Strikethrough"
        onSelect={(current) => current.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </EditorBubbleItem>
      <EditorBubbleItem
        className="bubble-button"
        aria-label="Inline code"
        onSelect={(current) => current.chain().focus().toggleCode().run()}
      >
        <Code2 size={16} />
      </EditorBubbleItem>
      <EditorBubbleItem
        className="bubble-button"
        aria-label="Link"
        aria-expanded={linkOpen}
        onSelect={(current) => {
          setHref(current.getAttributes("link").href ?? "");
          setLinkOpen((open) => !open);
        }}
      >
        <Link size={16} />
      </EditorBubbleItem>
      {linkOpen && editor && (
        <form
          className="link-popover"
          aria-label="Edit link"
          onSubmit={(event) => {
            event.preventDefault();
            const value = href.trim();
            if (!value) {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
            } else {
              const url = getUrlFromString(value);
              if (!url) return;
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }
            setLinkOpen(false);
          }}
        >
          <input
            aria-label="Link URL"
            onKeyDown={(event) => {
              if (event.key === "Escape") setLinkOpen(false);
            }}
            placeholder="Paste a link"
            value={href}
            onChange={(event) => setHref(event.target.value)}
            ref={(input) => input?.focus()}
          />
          <button type="submit">Apply</button>
          <button
            type="button"
            aria-label="Remove link"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              setLinkOpen(false);
            }}
          >
            <Trash size={16} />
          </button>
        </form>
      )}
    </EditorBubble>
  );
}
