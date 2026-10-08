---
"@vectorfyco/novel-v3": major
---

Move the editor to the current toolchain: Tiptap 3.31, React 19.3, TypeScript 7, Vite 8 and Vitest 5.

**Upgrade notes (why this is a major release)**

- **Tiptap 3.31 is now required.** Every `@tiptap/*` package the editor depends on moved from `^3.19` to `^3.31.4`. If your app installs its own Tiptap packages or extensions, move them to 3.31 as well so there is a single copy; mixing 3.19–3.30 with this release is not supported.
- **Type declarations are packaged differently.** Declarations are emitted per module by TypeScript 7 instead of bundled, and `import` and `require` now resolve to separate `.d.ts` / `.d.cts` graphs at the same entry paths (`.`, `./client`, `./client/core`, `./server`). Runtime entry points and export names are unchanged. Type-checking is verified for TypeScript 7.0 and 5.9 under both `bundler` and `node16` resolution; deep imports into `dist/` internals were never supported and may have moved.
- **React peer range is unchanged (`>=18`)**, but the editor is now built and tested against React 19.3.

**Added**

- `MathematicsOptions` and `TwitterOptions` types are exported.
- Options inherited from Tiptap 3.31: `CharacterCount.autoTrim`, `CodeBlockLowlight.exitOnArrowUp`, `TiptapLink.markdownLinks`, and an optional `staticEditorOptions` on the server `renderHTMLString` / `renderMarkdown` options.
- A TanStack Start example app (`apps/tanstack-start`) alongside the Next.js and React Router examples.

**Fixed**

- `require("@vectorfyco/novel-v3")` no longer throws at load: Tiptap extensions are imported by name, so the CommonJS build works with Tiptap 3.31's module shape.
- `getAllContent` and the Markdown helpers no longer re-register extensions on every call, which removed the repeated "duplicate extension names" warning while typing.
- The default client and server bundles register the horizontal rule, code block and image extensions once each.

**Compatibility**

- No export was removed or renamed, and no option or prop was removed. Slash-command (`Command`) options stay as permissive as in 2.0.1.
- Tooling only: the repository now lints with oxlint, formats with oxfmt, and tests with Vitest 5; Biome is removed. This does not affect consumers.
