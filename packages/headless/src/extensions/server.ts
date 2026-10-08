import { InputRule } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline as TiptapUnderline } from "@tiptap/extension-underline";
import { Youtube } from "@tiptap/extension-youtube";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { StarterKit } from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { AIHighlight } from "./ai-highlight";
import CustomKeymap from "./custom-keymap";
import UpdatedImage from "./updated-image";

const PlaceholderExtension = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === "heading") {
      return `Heading ${node.attrs.level}`;
    }
    return "Press '/' for commands";
  },
  includeChildren: true,
});

const HighlightExtension = Highlight.configure({
  multicolor: true,
});

const MarkdownExtension = Markdown.configure({
  markedOptions: {
    gfm: true,
    breaks: false,
  },
});

const StarterKitExtension = StarterKit.configure({
  horizontalRule: false,
  codeBlock: false,
  link: false,
  underline: false,
});

const Horizontal = HorizontalRule.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/u,
        handler: ({ state, range }) => {
          const attributes = {};

          const { tr } = state;
          const start = range.from;
          const end = range.to;

          tr.insert(start - 1, this.type.create(attributes)).delete(tr.mapping.map(start), tr.mapping.map(end));
        },
      }),
    ];
  },
});

const CodeBlockLowlightExtension = CodeBlockLowlight.configure({
  lowlight: createLowlight(common),
});

export {
  CodeBlockLowlightExtension as CodeBlockLowlight,
  Horizontal as HorizontalRule,
  InputRule,
  PlaceholderExtension as Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TiptapImage,
  TiptapUnderline,
  MarkdownExtension,
  TextStyle,
  Color,
  HighlightExtension,
  CustomKeymap,
  TiptapLink,
  UpdatedImage,
  Youtube,
  CharacterCount,
  AIHighlight,
};

export const serverExtensions = [
  StarterKitExtension,
  PlaceholderExtension,
  TiptapLink,
  UpdatedImage,
  TaskList,
  TaskItem,
  Horizontal,
  AIHighlight,
  CodeBlockLowlightExtension,
  Youtube,
  CharacterCount,
  TiptapUnderline,
  MarkdownExtension,
  HighlightExtension,
  TextStyle,
  Color,
  CustomKeymap,
];
