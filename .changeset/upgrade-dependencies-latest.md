---
"@vectorfyco/novel-v3": minor
---

Upgrade all dependencies to their latest stable releases, including TypeScript 7, Vite 8, Vitest 5, Tiptap 3.31 and React 19.3. The peer range for React stays `>=18`.

Public types: `MathematicsOptions` and `TwitterOptions` are now exported, and slash command options remain compatible with 2.0.1; the extension supplies its own `editor`. No existing export was removed or renamed.

Declaration files are now emitted per module by `tsc`, with explicit internal references and separate ESM/CJS type conditions at the existing entry paths.

Avoid expanding registered extensions during Markdown serialization, register each bundled extension once, and repair the Express 5 production example server.
