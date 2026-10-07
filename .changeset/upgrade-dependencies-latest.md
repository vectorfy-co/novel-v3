---
"@vectorfyco/novel-v3": minor
---

Upgrade all dependencies to their latest stable releases, including TypeScript 7, Vite 8, Vitest 5, Tiptap 3.31 and React 19.3. The peer range for React stays `>=18`.

Public types: `MathematicsOptions` and `TwitterOptions` are now exported, and the slash command `suggestion` option no longer requires `editor`. No existing export was removed or renamed.

Declaration files are now emitted per module by `tsc`, at the same `dist` paths as before.
