import { EditorBubble, EditorBubbleItem } from "@vectorfyco/novel-v3/client";
import { Bold, Code2, Italic, Link, Strikethrough, Underline } from "lucide-react";

export function BubbleMenu() {
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
        onSelect={(current) => {
          const href = window.prompt("Link URL");
          if (href) current.chain().focus().setLink({ href }).run();
        }}
      >
        <Link size={16} />
      </EditorBubbleItem>
    </EditorBubble>
  );
}
