import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join, resolve, relative } from "node:path";

const dist = resolve("dist");
async function prepare(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await prepare(path);
    } else if (entry.name.endsWith(".d.ts")) {
      const source = await readFile(path, "utf8");
      const imports = [...source.matchAll(/(?:from\s*|import\s*\()(["'])(\.[^"']+)\1/g)];
      let esm = source;
      let cjs = source;
      for (const [, quote, specifier] of imports) {
        const target = resolve(dirname(path), specifier);
        const file = await stat(`${target}.d.ts`)
          .then(() => target)
          .catch(() => join(target, "index"));
        // Validate every internal declaration reference before publishing.
        await stat(`${file}.d.ts`);
        const normalized = relative(dirname(path), file).split("\\").join("/");
        const prefix = normalized.startsWith(".") ? normalized : `./${normalized}`;
        esm = esm.replaceAll(`${quote}${specifier}${quote}`, `${quote}${prefix}.js${quote}`);
        cjs = cjs.replaceAll(`${quote}${specifier}${quote}`, `${quote}${prefix}.cjs${quote}`);
      }
      // These dependencies are ESM-only (or reference ESM-only types). Select their import declarations
      // explicitly in the CJS type graph; this has no effect on the runtime bundles.
      cjs = cjs.replace(
        /import GlobalDragHandle from "tiptap-extension-global-drag-handle";/g,
        'declare const GlobalDragHandle: typeof import("tiptap-extension-global-drag-handle", { with: { "resolution-mode": "import" } }).default;',
      );
      cjs = cjs.replace(
        /import type ([^;]+) from "(jotai|@tiptap\/markdown)";/g,
        'import type $1 from "$2" with { "resolution-mode": "import" };',
      );
      cjs = cjs.replace(
        /import\("(jotai|@tiptap\/markdown)"\)/g,
        'import("$1", { with: { "resolution-mode": "import" } })',
      );
      await writeFile(path, esm);
      await writeFile(path.replace(/\.d\.ts$/, ".d.cts"), cjs);
    }
  }
}
await prepare(dist);
