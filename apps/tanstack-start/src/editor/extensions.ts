import {
  CodeBlockLowlight,
  Color,
  HighlightExtension,
  HorizontalRule,
  MarkdownExtension,
  Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TextStyle,
  TiptapImage,
  TiptapLink,
  TiptapUnderline,
} from "@vectorfyco/novel-v3/client";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

// StarterKit ships its own code block and horizontal rule. CodeBlockLowlight and HorizontalRule replace them,
// so they are switched off here to avoid duplicate extension names.
export const editorExtensions = [
  StarterKit.configure({ link: false, underline: false, codeBlock: false, horizontalRule: false }),
  Placeholder,
  TiptapLink.configure({ openOnClick: false, autolink: true }),
  TiptapImage.configure({ allowBase64: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  HorizontalRule,
  CodeBlockLowlight.configure({ lowlight }),
  TiptapUnderline,
  TextStyle,
  Color,
  HighlightExtension,
  MarkdownExtension.configure({ markedOptions: { gfm: true, breaks: false } }),
];
